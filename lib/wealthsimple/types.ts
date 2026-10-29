export type WealthsimpleAmountSign = "negative" | "positive";

export type WealthsimpleActivity = {
  accountId: string;
  amount: string;
  amountSign: WealthsimpleAmountSign;
  canonicalId: string;
  currency: string;
  occurredAt: string;
  spendMerchant: string | null;
  subType: string | null;
  type: string;
  unifiedStatus: string | null;
};

export type WealthsimpleCreditCardAccount = {
  id: string;
  status: string;
  creditLimit: number;
  balance: {
    current: string;
    outstanding: string;
    availableCreditLimit: string;
    pending: string;
  };
  currentCards: Array<{
    id: string;
    cardNumber: string;
    cardVariant: string;
    isLocked: boolean;
    isPhysicalCardActivated: boolean;
    isSupplementaryCard: boolean;
    nameOnCard: string;
  }>;
};

export type ActivityPage = {
  activities: WealthsimpleActivity[];
  hasNextPage: boolean;
  endCursor: string | null;
};
