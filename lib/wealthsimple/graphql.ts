export const FETCH_CREDIT_CARD_ACTIVITIES_EXPORT_OPERATION = {
  name: "FetchCreditCardActivitiesExport",
  hash: "a14852693a771daf37eb50c89cd4ba8f917f28435e20dd13b2602859e7c71c3c",
  query: `query FetchCreditCardActivitiesExport($accountIds: [String], $startDate: Datetime, $endDate: Datetime, $first: Int, $after: Cursor) {
  activities(
    accountIds: $accountIds
    startDate: $startDate
    endDate: $endDate
    types: [CREDIT_CARD]
    first: $first
    after: $after
  ) {
    edges {
      cursor
      node {
        canonicalId
        accountId
        occurredAt
        subType
        spendMerchant
        amount
        amountSign
        currency
        type
        unifiedStatus
        notes
        spendTrackingCategory {
          nameEn
          nameFr
          __typename
        }
        __typename
      }
      __typename
    }
    pageInfo {
      hasNextPage
      endCursor
      __typename
    }
    __typename
  }
}`,
};

export const FETCH_ALL_ACCOUNTS_OPERATION = {
  name: "FetchAllAccounts",
  query: `query FetchAllAccounts($identityId: ID!, $filter: AccountsFilter = {}, $pageSize: Int = 25, $cursor: String) {
  identity(id: $identityId) {
    accounts(filter: $filter, first: $pageSize, after: $cursor) {
      edges {
        node {
          id
          unifiedAccountType
          nickname
          isOpen
          type
          status
          __typename
        }
        __typename
      }
      __typename
    }
    __typename
  }
}`,
};

export const FETCH_CARD_SUMMARY_OPERATION = {
  name: "FetchCreditCardAccountSummary",
  query: `query FetchCreditCardAccountSummary($id: ID!) {
  creditCardAccount(id: $id) {
    id
    balance {
      current
      __typename
    }
    creditLimit
    currentCardsV2 {
      cardNumberLast4Digits
      cardVariant
      __typename
    }
    __typename
  }
}`,
};
