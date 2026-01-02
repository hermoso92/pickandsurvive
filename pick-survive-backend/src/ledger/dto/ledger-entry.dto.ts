export interface EntryFeeMeta {
  entryFee: number;
  editionName: string;
  leagueName: string;
}

export interface PrizePayoutMeta {
  prizeAmount: number;
  editionName: string;
  leagueName: string;
  position?: number;
  split?: number;
}

export interface RolloverMeta {
  rolloverAmount: number;
  fromEdition?: string;
  toEdition?: string;
}

export interface AdjustmentMeta {
  reason: string;
  adminNote?: string;
}

export type LedgerMetaJson = 
  | EntryFeeMeta 
  | PrizePayoutMeta 
  | RolloverMeta 
  | AdjustmentMeta 
  | Record<string, any>;

