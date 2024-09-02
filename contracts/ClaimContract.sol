// 
pragma solidity >=0.8.1 <0.9.0;

contract ClaimContract {

/* ====  CONSTANTS ==== */
    bytes16 internal constant HEX_DIGITS = "0123456789abcdef";

    uint8 internal constant ETH_ADDRESS_BYTE_LEN = 20;
    uint8 internal constant ETH_ADDRESS_HEX_LEN = ETH_ADDRESS_BYTE_LEN * 2;

/* ====  FIELDS ==== */

    /// @notice timestamp in UNIX Epoch timestep when the first dilution can happen.
    /// Claimers will only receive 75% of their balance.
    uint256 public dilute_s1_75_timestamp;

    /// @notice timestamp in UNIX Epoch timestep when the second dilution can happen.
    /// Claimers will only receive 50% of their balance.
    uint256 public dilute_s2_50_timestamp;
    
    /// @notice timestamp in UNIX Epoch timestep when the third and final dilution can happen.
    /// All remaining unclaimed balances will be sent to the DAO and ReinsertPot.
    uint256 public dilute_s3_0_timestamp;

    /// @notice balances from DMDv3 network that are claimable.
    mapping(bytes20 => uint256) public balances;

    /* solhint-disable var-name-mixedcase */
    /// @notice  tracks if dilution for 75% was executed
    bool public dilution_s1_75_executed;

    /// @notice  tracks if dilution for 50% was executed
    bool public dilution_s2_50_executed;

    /// @notice tracks if dilution for 0% was executed
    bool public dilution_s3_0_executed;
    /* solhint-enable var-name-mixedcase */

    /// @notice address of the reinsert pot that will receive half the diluted funds.
    address payable public lateClaimBeneficorAddressReinsertPot;

    /// @notice address of the DAO address that will receive the other half of the diluted funds.
    address payable public lateClaimBeneficorAddressDAO;

    /// @notice the prefix for the signing message.
    /// A Prefix for the signing message can be used to separate different message between different contracts/networks
    /// e.g.: "claim to testnet" for indicating that this is only a testnet claim.
    /// the prefix is part of the signed message .
    bytes public prefixStr;

/* ====  ERRORS ==== */
    /// @notice dilute event did already happen.
    error DiluteAllreadyHappened();

    /// @notice dilute events need to get execute in the correct order.
    error PredecessorDiluteEventNotHappened();

    /// @notice dilute event can only get called after the treshold timestamp is reached. 
    error DiluteTimeNotReached();

    /// @notice constructor argument error: first dilution event must be in the future. 
    error InitializationErrorDiluteTimestamp1();
    
    /// @notice constructor argument error: second dilution event must be after the first.
    error InitializationErrorDiluteTimestamp2();

    /// @notice constructor argument error: third dilution event must be after the second.
    error InitializationErrorDiluteTimestamp3();
    
    /// @notice constructor argument error: third dilution event must be after the second.
    error InitializationErrorDaoAddressNull();
    
    /// @notice constructor argument error: third dilution event must be after the second.
    error InitializationErrorReinsertPotAddressNull();
    
    /// @notice Fill Error: The Claim contract is already filled and cannot get filled a second time.
    error FillErrorBalanceDoubleFill();

    /// @notice Fill Error: There must be a value transfered to the ClaimContract.
    error FillErrorValueRequired();

    /// @notice Fill Error: number of accounts need to match number of balances.
    error FillErrorNumberOfAccountsMissmatch();

    /// @notice Fill Error: number of accounts need to match number of balances.
    error FillErrorAccountZero();

    /// @notice Fill Error: cannot add account with Zero Balance.
    error FillErrorBalanceZero();

    /// @notice Fill Error: cannot add account with Zero Balance.
    error FillErrorAccountAlreadyDefined();

    /// @notice Fill Error: The payment for this function must be equal to the sum of all balances.
    error FillErrorBalanceSumError();

    /// @notice Claim Error: provided address does not have a balance.
    error ClaimErrorNoBalance();

    /// @notice Claim Error: Signature does not match
    error ClaimErrorSignatureMissmatch();

    /// @notice Provided v value is invalid for Ethereum signatures.
    error CryptoInvalidV();

    /// @notice Transfer of @param amount to address @param recipient failed.
    error TransferFailed(address recipient, uint256 amount);

    /// @notice Insufficient balance to transfer the requested amount.
    error InsufficientBalance();

/* ====  EVENTS ==== */
    /// @notice Claim event is triggered when a claim was successful.
    event Claim(
        bytes20 indexed _from,
        address _to,
        uint256 amount,
        uint256 _nominator,
        uint256 _denominator
    );

    /// @notice creates a new ClaimContract instance that is able to get filled.
    /// @param _lateClaimBeneficorAddressReinsertPot address, see field lateClaimBeneficorAddressReinsertPot
    /// @param _lateClaimBeneficorAddressDAO address, see field lateClaimBeneficorAddressDAO
    /// @param _prefixStr prefix used for all claim messages, see field prefixStr
    /// @param _dilute_s1_75_timestamp first dilution UNIX Epoch timestamp, see field dilute_s1_75_timestamp
    /// @param _dilute_s2_50_timestamp second dilution UNIX Epoch timestamp, see field dilute_s2_50_timestamp
    /// @param _dilute_s3_0_timestamp third dilution UNIX Epoch timestamp, see field dilute_s3_0_timestamp
    constructor(
        address payable _lateClaimBeneficorAddressReinsertPot,
        address payable _lateClaimBeneficorAddressDAO,
        bytes memory _prefixStr,
        uint256 _dilute_s1_75_timestamp,
        uint256 _dilute_s2_50_timestamp,
        uint256 _dilute_s3_0_timestamp
    ) {
        if (_lateClaimBeneficorAddressReinsertPot == address(0)) revert InitializationErrorReinsertPotAddressNull();
        if (_lateClaimBeneficorAddressDAO == address(0)) revert InitializationErrorDaoAddressNull();
        if (_dilute_s1_75_timestamp <= block.timestamp) revert InitializationErrorDiluteTimestamp1();
        if (_dilute_s2_50_timestamp <= _dilute_s1_75_timestamp) revert InitializationErrorDiluteTimestamp2();
        if (_dilute_s3_0_timestamp <= _dilute_s2_50_timestamp) revert  InitializationErrorDiluteTimestamp3();

        lateClaimBeneficorAddressReinsertPot = _lateClaimBeneficorAddressReinsertPot;
        lateClaimBeneficorAddressDAO = _lateClaimBeneficorAddressDAO;

        prefixStr = _prefixStr;

        dilute_s1_75_timestamp = _dilute_s1_75_timestamp;
        dilute_s2_50_timestamp = _dilute_s2_50_timestamp;
        dilute_s3_0_timestamp = _dilute_s3_0_timestamp;
    }

    /// @notice fills the contract with balances from DMD diamonds V3 network. 
    /// @param _accounts array of accounts, only the 20 byte essential part
    /// of DMDv3 addresses (no prefix, no checksums0) 
    /// @param _balances array of balances, index based mapping to @param _accounts
    function fill(bytes20[] memory _accounts, uint256[] memory _balances) external payable {
        
        //for simplification we only support a one-shot initialisation.
        if (address(this).balance != msg.value) revert FillErrorBalanceDoubleFill();
        if (msg.value == 0) revert FillErrorValueRequired();
        if (_accounts.length != _balances.length) revert FillErrorNumberOfAccountsMissmatch();

        // we verify if the transfered amount that get added to the sum up to the total amount added.
        uint256 totalBalanceAdded = 0;

        for (uint256 i = 0; i < _accounts.length; ++i) {
            if (_accounts[i] == bytes20(address(0))) revert FillErrorAccountZero();
            if (_balances[i] == 0) revert FillErrorBalanceZero();
            if (balances[_accounts[i]] != 0) revert FillErrorAccountAlreadyDefined(); 
            totalBalanceAdded += _balances[i];
            balances[_accounts[i]] = _balances[i];
        }

        if (msg.value != totalBalanceAdded) revert FillErrorBalanceSumError();
    }

    /// @notice Claims the funds from the provided public key to the 
    /// _targetAdress by providing a matching signature.
    /// @param _targetAdress Ethereum style address where the funds should get claimed to. 
    /// @param _postfix an optional string postfix that can be added to the message.
    /// Useful to work around the limitation that only 32 byte R and S values can be processed.
    /// @param _pubKeyX ECDSA public key X coordinate
    /// @param _pubKeyY ECDSA public key X coordinate
    /// @param _v ECDSA V 
    /// @param _r ECDSA R (32 byte)
    /// @param _s ECDSA S (32 byte)
    function claim(
        address payable _targetAdress,
        bytes memory _postfix,
        bytes32 _pubKeyX,
        bytes32 _pubKeyY,
        uint8 _v,
        bytes32 _r,
        bytes32 _s
    ) external {
        //retrieve the oldAddress out of public key.
        bytes20 oldAddress = publicKeyToDMDAddress(_pubKeyX, _pubKeyY);

        //if already claimed, it just returns.
        uint256 currentBalance = balances[oldAddress];
        if (currentBalance == 0) revert ClaimErrorNoBalance();

        // verify if the signature matches to the provided pubKey here.
        if (!claimMessageMatchesSignature(_targetAdress, _postfix, _pubKeyX, _pubKeyY, _v, _r, _s))
            revert ClaimErrorSignatureMissmatch();

        (uint256 nominator, uint256 denominator) = getCurrentDilutedClaimFactor();
        uint256 claimBalance = (currentBalance * nominator) / denominator;

        // remember that the funds are going to get claimed, hard protection about reentrancy attacks.
        balances[oldAddress] = 0;

        _transferNative(_targetAdress, claimBalance);

        emit Claim(oldAddress, _targetAdress, claimBalance, nominator, denominator);
    }
    
    /// @notice dilutes the entitlement after a certain time passed away and sends it to the beneficor (reinsert pot)
    /// @return amount of DMD that got send to the beneficor.
    function dilute1() external returns (uint256) {
        if (block.timestamp < getDilutionTimestamp1()) revert DiluteTimeNotReached();
        
        if (dilution_s1_75_executed) {
            revert DiluteAllreadyHappened();
        }

        dilution_s1_75_executed = true;
        // in dilute 1: after 3 months 25% of the total coins get diluted.

        uint256 totalBalance = (payable(address(this))).balance;
        uint256 dilutionBalance = totalBalance / 4;

        _sendDilutedAmounts(dilutionBalance);

        return dilutionBalance;
    }

    /**
     * @notice dilutes the entitlement after a certain time passed away and sends it to the beneficor (reinsert pot)
     * @return amount of DMD that got send to the beneficor.
     */
    function dilute2() external returns (uint256) {

        if (block.timestamp < getDilutionTimestamp2()) revert DiluteTimeNotReached();
        if (!dilution_s1_75_executed) revert PredecessorDiluteEventNotHappened();
        if (dilution_s2_50_executed) revert DiluteAllreadyHappened();
        
        dilution_s2_50_executed = true;
        // in dilute 1: after 3 months 25% of the total coins get diluted.

        uint256 totalBalance = (payable(address(this))).balance;

        // during dilute2,
        // 25% from dilute1 are already counted away from totalBalance.
        // means 3/4 of the value is still there and we need to get it to 2/4.
        // we can do this by dilluting another 1 / 3.

        uint256 dilutionBalance = totalBalance / 3;

        _sendDilutedAmounts(dilutionBalance);

        return dilutionBalance;
    }

    /**
     * @notice dilutes the entitlement after a certain time passed away and sends it to the beneficor (reinsert pot)
     * @return amount of DMD that got send to the beneficor.
     */
    function dilute3() external returns (uint256) {
        if (block.timestamp < getDilutionTimestamp3()) revert DiluteTimeNotReached();
        if (!dilution_s2_50_executed) revert PredecessorDiluteEventNotHappened();
        if (dilution_s3_0_executed) revert DiluteAllreadyHappened();

        dilution_s3_0_executed = true;
        
        uint256 totalBalance = (payable(address(this))).balance;
        _sendDilutedAmounts(totalBalance);
        return totalBalance;
    }

    /**
     * @notice returns the hash for the provided claim target address.
     * @param _claimToAddr address target address for the claim.
     * @return bytes32 Bitcoin hash of the claim message.
     */
    function createClaimMessage(
        address _claimToAddr,
        bytes memory _postfix
    ) public view returns (bytes memory) {
        //TODO: pass this as an argument. evaluate in JS before includeAddrChecksum is used or not.
        //now for testing, we assume Yes.

        bytes memory addrStr = calculateAddressString(_claimToAddr);

        return
            abi.encodePacked(
                uint8(24), //24 byte prefix.
                "Diamond Signed Message:\n",
                uint8(prefixStr.length) + ETH_ADDRESS_HEX_LEN + 2 + uint8(_postfix.length),
                prefixStr,
                addrStr,
                _postfix
            );
    }

    /**
     * @notice returns the hash for the provided claim target address.
     * @param _claimToAddr address target address for the claim.
     * @return bytes32 DMD style hash of the claim message.
     */
    function getHashForClaimMessage(
        address _claimToAddr,
        bytes memory _postfix
    ) public view returns (bytes32) {
        return calcHash256(createClaimMessage(_claimToAddr, _postfix));
    }


    /**
     * @notice cryptographic verification if the messages matches
        @param _claimToAddr receiver address of the claim.,
        @param _postFix postfix of the message as utf-8 bytes,
        @param _pubKeyX X coordinate of the ECDSA public key,
        @param _pubKeyY Y coordinate of the ECDSA public key,
        @param _v ECDSA v
        @param _r ECDSA r
        @param _s ECDSA s
     * @return bool true if it matches.
     */
    function claimMessageMatchesSignature(
        address _claimToAddr,
        bytes memory _postFix,
        bytes32 _pubKeyX,
        bytes32 _pubKeyY,
        uint8 _v,
        bytes32 _r,
        bytes32 _s
    ) public view returns (bool) {

        if (_v < 27 || _v > 30) revert CryptoInvalidV();
        
        /*
          ecrecover() returns an Eth address rather than a public key, so
          we must do the same to compare.
        */
        address pubKeyEthAddr = pubKeyToEthAddress(_pubKeyX, _pubKeyY);

        //we need to check if X and Y corresponds to R and S.

        /* Create and hash the claim message text */
        bytes32 messageHash = getHashForClaimMessage(_claimToAddr, _postFix);

         /* Verify the public key */
        return ecrecover(messageHash, _v, _r, _s) == pubKeyEthAddr;
    }

    function getDilutionTimestamp1() public view returns (uint256) {
        return dilute_s1_75_timestamp;
    }

    function getDilutionTimestamp2() public view returns (uint256) {
        return dilute_s2_50_timestamp;
    }

    function getDilutionTimestamp3() public view returns (uint256) {
        return dilute_s3_0_timestamp;
    }

    function getCurrentDilutedClaimFactor()
        public
        view
        returns (uint256 nominator, uint256 denominator)
    {
        if (!dilution_s1_75_executed) {
            return (4, 4);
        } else if (!dilution_s2_50_executed) {
            return (3, 4);
        } else if (!dilution_s3_0_executed) {
            return (2, 4);
        }
    }

    /// @notice returns the essential part of a Bitcoin-style address associated with an ECDSA public key
    /// @param _publicKeyX X coordinate of the ECDSA public key
    /// @param _publicKeyY Y coordinate of the ECDSA public key
    /// @return rawBtcAddress Raw parts of the Bitcoin Style address
    function publicKeyToDMDAddress(
        bytes32 _publicKeyX,
        bytes32 _publicKeyY
    ) public pure returns (bytes20 rawBtcAddress) {
        return
            ripemd160(
                abi.encodePacked(
                    sha256(
                        abi.encodePacked((uint256(_publicKeyY) & 1) == 0 ? 0x02 : 0x03, _publicKeyX)
                    )
                )
            );
    }

    /**
     * @notice PUBLIC FACING: Derive an Ethereum address from an ECDSA public key
     * @param pubKeyX First  half of uncompressed ECDSA public key
     * @param pubKeyY Second half of uncompressed ECDSA public key
     * @return Derived Eth address
     */
    function pubKeyToEthAddress(bytes32 pubKeyX, bytes32 pubKeyY) public pure returns (address) {
        return address(uint160(uint256(keccak256(abi.encodePacked(pubKeyX, pubKeyY)))));
    }

    /**
     * @notice sha256(sha256(data))
     * @param data Data to be hashed
     * @return 32-byte hash
     */
    function calcHash256(bytes memory data) public pure returns (bytes32) {
        // NOTE: https://github.com/axic/ethereum-bsm/blob/master/bsm.sol
        // maybe encodePacked is not required ?!
        return sha256(abi.encodePacked(sha256(data)));
    }

    /**
     * @notice calculates the address string representation of the signed address.
     * @param _addr address
     * @return addrStr ethereum address(24 byte)
     */
    function calculateAddressString(address _addr) public pure returns (bytes memory addrStr) {
        bytes memory tmp = new bytes(ETH_ADDRESS_HEX_LEN);
        _hexStringFromData(tmp, bytes32(bytes20(_addr)), 0, ETH_ADDRESS_BYTE_LEN);

        bytes32 addrStrHash = keccak256(tmp);
        uint256 offset = 0;

        for (uint256 i = 0; i < ETH_ADDRESS_BYTE_LEN; i++) {
            uint8 b = uint8(addrStrHash[i]);

            _addressStringChecksumChar(tmp, offset++, b >> 4);
            _addressStringChecksumChar(tmp, offset++, b & 0x0f);
        }

        // the correct checksum is now in the tmp variable.
        // we extend this by the Ethereum usual prefix 0x

        addrStr = new bytes(ETH_ADDRESS_HEX_LEN + 2);

        addrStr[0] = "0";
        addrStr[1] = "x";

        for (uint256 i = 0; i < ETH_ADDRESS_HEX_LEN; i++) {
            addrStr[i + 2] = tmp[i];
        }

        return addrStr;
    }

    function _sendDilutedAmounts(uint256 amount) internal {

        //diluted amounts are split 50/50 to DAO and ReinsertPot.
        uint256 transferForResinsertPot = amount / 2;
        uint256 transferForDAO = amount - transferForResinsertPot;

        _transferNative(lateClaimBeneficorAddressReinsertPot, transferForResinsertPot);
        _transferNative(lateClaimBeneficorAddressDAO, transferForDAO);
    }

    function _transferNative(address recipient, uint256 amount) internal {
        if (address(this).balance < amount) {
            revert InsufficientBalance();
        }

        // solhint-disable-next-line avoid-low-level-calls
        //slither-disable-next-line arbitrary-send-eth
        (bool success, ) = recipient.call{ value: amount }("");
        if (!success) {
            revert TransferFailed(recipient, amount);
        }
    }

    function _hexStringFromData(
        bytes memory hexStr,
        bytes32 data,
        uint256 startOffset,
        uint256 dataLen
    ) private pure {
        uint256 offset = startOffset;

        for (uint256 i = 0; i < dataLen; i++) {
            uint8 b = uint8(data[i]);

            hexStr[offset++] = HEX_DIGITS[b >> 4];
            hexStr[offset++] = HEX_DIGITS[b & 0x0f];
        }
    }

    function _addressStringChecksumChar(
        bytes memory addrStr,
        uint256 offset,
        uint8 hashNybble
    ) private pure {
        bytes1 ch = addrStr[offset];

        if (ch >= "a" && hashNybble >= 8) {
            addrStr[offset] = ch ^ 0x20;
        }
    }
}
