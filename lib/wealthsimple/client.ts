import { z } from "zod";
import {
  FETCH_CREDIT_CARD_ACTIVITIES_EXPORT_OPERATION,
  FETCH_ALL_ACCOUNTS_OPERATION,
  FETCH_CARD_SUMMARY_OPERATION,
} from "./graphql";
import type { ActivityPage, WealthsimpleActivity } from "./types";

export type WealthsimpleAuth = {
  accessToken: string;
  identityId: string;
  deviceId?: string;
};

// Thrown when a Wealthsimple request comes back with 401, signalling that the
// user's session has expired and they need to re-open Wealthsimple to refresh it.
export class WealthsimpleAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WealthsimpleAuthError";
  }
}

export type WealthsimpleAccountSummary = {
  id: string;
  unifiedAccountType: string;
  nickname: string | null;
  isOpen: boolean;
};

export type WealthsimpleCardDetail = {
  id: string;
  creditLimit: number;
  balance: {
    current: string;
  };
  currentCardsV2: Array<{
    cardNumberLast4Digits: string;
    cardVariant: string;
  }>;
};

const activitySchema = z.object({
  accountId: z.string(),
  amount: z.string(),
  amountSign: z.enum(["negative", "positive"]),
  canonicalId: z.string(),
  currency: z.string(),
  occurredAt: z.string(),
  spendMerchant: z.string().nullable(),
  subType: z.string().nullable(),
  type: z.string(),
  unifiedStatus: z.string().nullable(),
  notes: z.string().nullable(),
  spendTrackingCategory: z
    .object({
      nameEn: z.string(),
      nameFr: z.string(),
    })
    .nullable(),
});

const activityPageSchema = z.object({
  activities: z.object({
    edges: z.array(z.object({ node: activitySchema })),
    pageInfo: z.object({
      hasNextPage: z.boolean(),
      endCursor: z.string().nullable(),
    }),
  }),
});

type ActivityRangeResult = {
  activities: WealthsimpleActivity[];
  possiblyTruncated: boolean;
};

const accountSummarySchema = z.object({
  id: z.string(),
  unifiedAccountType: z.string(),
  nickname: z.string().nullable(),
  isOpen: z.boolean(),
});

const allAccountsSchema = z.object({
  identity: z.object({
    accounts: z.object({
      edges: z.array(z.object({ node: accountSummarySchema })),
    }),
  }),
});

const creditCardAccountSchema = z.object({
  creditCardAccount: z.object({
    id: z.string(),
    creditLimit: z.number(),
    balance: z.object({
      current: z.string(),
    }),
    currentCardsV2: z.array(
      z.object({
        cardNumberLast4Digits: z.string(),
        cardVariant: z.string(),
      }),
    ),
  }),
});

export class WealthsimpleClient {
  constructor(
    private readonly accountId: string,
    private readonly auth: WealthsimpleAuth,
  ) {}

  private async fetchCreditCardActivityPage(options: {
    endDate: Date;
    startDate: Date;
    cursor?: string | null;
    first?: number;
  }): Promise<ActivityPage> {
    const data = await this.graphql(FETCH_CREDIT_CARD_ACTIVITIES_EXPORT_OPERATION, {
      accountIds: [this.accountId],
      startDate: options.startDate.toISOString(),
      endDate: options.endDate.toISOString(),
      first: options.first ?? 1000,
      after: options.cursor ?? undefined,
    });
    const parsed = activityPageSchema.parse(data);

    return {
      activities: parsed.activities.edges.map((edge) => edge.node),
      hasNextPage: parsed.activities.pageInfo.hasNextPage,
      endCursor: parsed.activities.pageInfo.endCursor,
    };
  }

  async fetchCreditCardActivity(options: {
    endDate: Date;
    startDate: Date;
    first?: number;
  }): Promise<WealthsimpleActivity[]> {
    const activities = new Map<string, WealthsimpleActivity>();
    const ranges: Array<{ startDate: Date; endDate: Date }> = [
      { startDate: options.startDate, endDate: options.endDate },
    ];

    while (ranges.length > 0) {
      const range = ranges.pop();
      if (range === undefined) break;

      const result = await this.fetchCreditCardActivityRange({
        ...range,
        first: options.first,
      });

      const rangeMs = range.endDate.getTime() - range.startDate.getTime();
      if (result.possiblyTruncated && rangeMs > 1) {
        const midpoint = new Date(range.startDate.getTime() + Math.floor(rangeMs / 2));
        ranges.push(
          { startDate: range.startDate, endDate: midpoint },
          { startDate: midpoint, endDate: range.endDate },
        );
        continue;
      }

      for (const activity of result.activities) {
        activities.set(activity.canonicalId, activity);
      }
    }

    return [...activities.values()].filter(
      (activity) =>
        new Date(activity.occurredAt) >= options.startDate &&
        new Date(activity.occurredAt) <= options.endDate,
    );
  }

  private async fetchCreditCardActivityRange(options: {
    endDate: Date;
    startDate: Date;
    first?: number;
  }): Promise<ActivityRangeResult> {
    const activities: WealthsimpleActivity[] = [];
    let cursor: string | null | undefined;
    let hasNextPage = false;

    for (;;) {
      const page = await this.fetchCreditCardActivityPage({
        startDate: options.startDate,
        endDate: options.endDate,
        first: options.first,
        cursor,
      });
      activities.push(...page.activities);
      hasNextPage = page.hasNextPage;

      if (!page.hasNextPage || page.endCursor === null) break;
      cursor = page.endCursor;
    }

    return {
      activities,
      // The export operation is documented to cap a result set at 1,000 items.
      // Split the date range when it appears to have stopped at that cap.
      possiblyTruncated: activities.length === 1000 && !hasNextPage,
    };
  }

  async fetchCreditCardAccounts(): Promise<WealthsimpleAccountSummary[]> {
    const data = await this.graphql(FETCH_ALL_ACCOUNTS_OPERATION, {
      identityId: this.auth.identityId,
      pageSize: 1000,
    });
    const parsed = allAccountsSchema.parse(data);

    return parsed.identity.accounts.edges
      .map((e) => e.node)
      .filter((a) => a.unifiedAccountType === "CREDIT_CARD" && a.isOpen);
  }

  async fetchCreditCardDetail(cardId: string): Promise<WealthsimpleCardDetail> {
    const data = await this.graphql(FETCH_CARD_SUMMARY_OPERATION, { id: cardId });
    const parsed = creditCardAccountSchema.parse(data);
    return parsed.creditCardAccount;
  }

  private async graphql(
    operation: { name: string; query: string; hash?: string },
    variables: unknown,
  ): Promise<unknown> {
    const response = await fetch("https://my.wealthsimple.com/graphql", {
      method: "POST",
      headers: {
        accept: "*/*",
        authorization: `Bearer ${this.auth.accessToken}`,
        "content-type": "application/json",
        "x-platform-os": "web",
        "x-ws-api-version": "12",
        "x-ws-client-tier": "generation",
        "x-ws-identity-id": this.auth.identityId,
        "x-ws-locale": "en-CA",
        "x-ws-operation-name": operation.name,
        "x-ws-page": "page-activity",
        "x-ws-profile": "trade",
        ...(this.auth.deviceId === undefined ? {} : { "x-ws-device-id": this.auth.deviceId }),
        ...(operation.hash === undefined ? {} : { "x-ws-operation-hash": operation.hash }),
      },
      body: JSON.stringify({
        operationName: operation.name,
        variables,
        query: operation.query,
      }),
    });

    const body = (await response.json().catch(() => undefined)) as unknown;

    if (!response.ok) {
      if (response.status === 401) {
        throw new WealthsimpleAuthError(
          "Your Wealthsimple session has expired. Open Wealthsimple to refresh your authentication, then try again.",
        );
      }
      throw new Error(
        `Wealthsimple GraphQL request failed with ${response.status}: ${JSON.stringify(body)}`,
      );
    }

    const envelope = z
      .object({
        data: z.unknown().optional(),
        errors: z.unknown().optional(),
      })
      .parse(body);

    if (envelope.errors !== undefined) {
      throw new Error(`Wealthsimple GraphQL returned errors: ${JSON.stringify(envelope.errors)}`);
    }

    return envelope.data;
  }
}
