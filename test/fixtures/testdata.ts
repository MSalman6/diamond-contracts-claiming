import fs from "fs";
import { ClaimingDataSet } from "../../api/data/interfaces";

export function getTestBalancesFromTestdata(datasetname: string) : ClaimingDataSet {
    

    //let json = fs.readFileSync

    // read the json file.
    let json = fs.readFileSync(`test/testdata/${datasetname}.json`, { encoding: "utf-8" });

    let object = JSON.parse(json);
    object.isDMDSigned = true;
    return object;


}