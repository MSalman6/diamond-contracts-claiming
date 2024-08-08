import { ClaimingDataSet } from "../../api/data/interfaces";
export declare function getTestBalances(): {
    dmdv3Address: string;
    dmdv4Address: string;
    value: string;
    signature: string;
}[];
export declare function getTestBalances_DMD_cli_same_address(): ClaimingDataSet;
export declare function getTestBalances_DMD_cli(): ClaimingDataSet;
export declare function getTestBalances_DMD_cli_invalid_signature_size(): ClaimingDataSet;
export declare function getTestBalances_DMD(): {
    isDMDSigned: boolean;
    seedphrase: undefined;
    messagePrefix: string;
    balances: {
        dmdv3Address: string;
        dmdv4Address: string;
        value: string;
        signature: string;
    }[];
};
export declare function getTestBalances_DMD_with_prefix(): ClaimingDataSet;
export declare function getTestBalances_dillution(): ClaimingDataSet;
