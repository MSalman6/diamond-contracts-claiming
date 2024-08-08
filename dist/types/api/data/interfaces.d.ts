export interface BalanceV3 {
    dmdv3Address: string;
    value: string;
}
export interface ClaimingBalance extends BalanceV3 {
    dmdv4Address: string;
    signature: string;
}
export interface ClaimingDataSet {
    isDMDSigned: boolean;
    seedphrase: string | undefined;
    messagePrefix: string;
    balances: ClaimingBalance[];
}
