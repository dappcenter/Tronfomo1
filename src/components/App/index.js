
import React from 'react';

import TronWeb from 'tronweb';
import Swal from 'sweetalert2';
import Utils from 'utils';

// bootstrap
import {Button, Container, Row, Col} from 'react-bootstrap';


// components
import TronLinkGuide from 'components/TronLinkGuide';
import BuyForm from 'components/BuyFormComponent/BuyForm';
import SellForm from 'components/SellFormComponent/SellForm';
import Footer from 'components/footerComponent/footer'
import Toolbar from 'components/ToolbarComponent/Toolbar';
import SideDrawer from 'components/SideDrawer/SideDrawer';
import Backdrop from 'components/Backdrop/Backdrop';

// pictures
import PricePic from '../../assets/price_appreciation.png'
import DividendsPic from '../../assets/dividends.png'
import CommissionPic from '../../assets/commission.png'
import TelegramLogo from '../../assets/telegramLogo.png'
import DiscordLogo from '../../assets/discordLogo.png'
import GuildChatLogo from '../../assets/guildchatLogo.png'

import './App.scss';

const FOUNDATION_ADDRESS = 'TWiWt5SEDzaEqS6kE5gandWMNfxR2B5xzg';

var wait = ms => new Promise((r, j)=>setTimeout(r, ms))

var prevScrollpos = window.pageYOffset;
window.onscroll = function() {
    var currentScrollPos = window.pageYOffset;
    if (prevScrollpos > currentScrollPos || currentScrollPos < 56) {
        document.getElementById("toolbar").style.top = "0";
    } else {
        document.getElementById("toolbar").style.top = "-56px";
    }
    prevScrollpos = currentScrollPos;
};

class App extends React.Component {

    constructor(props) {
        super(props);
        this.state = {

            address: null, // user's wallet address

            referralAddress: 'TMGGJWpJNzEHCR9ndESKiaN9wFmFNug55Y',

            userReferralAddress: "",

            userTronBalance : 0,
            userTokenBalance: 0,
            userDividendsBalance: 0,

            contractTronBalance: 0,
            contractTokenBalance: 0,

            sellingPrice: 0,
            buyingPrice: 0,

            inputAmount: '',

            estimateTokensToBeReceived: 0,
            estimateTronsToBeReceived: 0,


            tronWeb: {
                installed: false,
                loggedIn: false
            },

        }
    }



    async componentDidMount() {
        await new Promise(resolve => {

            const tronWebState = {
                installed: !!window.tronWeb,
                loggedIn: window.tronWeb && window.tronWeb.ready
            };

            // if tronWeb is installed
            if(tronWebState.installed) {
                this.setState({
                    tronWeb:
                    tronWebState
                });

                return resolve();
            }
            let tries = 0;
            const timer = setInterval(() => {
                if(tries >= 10) {
                    const TRONGRID_API = 'https://api.trongrid.io';

                    window.tronWeb = new TronWeb(
                        TRONGRID_API,
                        TRONGRID_API,
                        TRONGRID_API
                    );

                    this.setState({
                        tronWeb: {
                            installed: false,
                            loggedIn: false
                        }
                    });
                    clearInterval(timer);
                    return resolve();
                }

                tronWebState.installed = !!window.tronWeb;
                tronWebState.loggedIn = window.tronWeb && window.tronWeb.ready;

                if(!tronWebState.installed)
                    return tries++;

                this.setState({
                    tronWeb: tronWebState
                });

                resolve();
            }, 100);

        });

        if(!this.state.tronWeb.loggedIn) {
            // Set default address (foundation address) used for contract calls
            // Directly overwrites the address object as TronLink disabled the
            // function call
            window.tronWeb.defaultAddress = {
                hex: window.tronWeb.address.toHex(FOUNDATION_ADDRESS),
                base58: FOUNDATION_ADDRESS
            };

            window.tronWeb.on('addressChanged', () => {
                if (this.state.tronWeb.loggedIn)
                    return;

                this.setState({
                    tronWeb: {
                        installed: true,
                        loggedIn: true
                    }
                });
            });
        }



        await wait(1500);
        this.checkTronLink();
        // this.checkTronLink();

        await Utils.setTronWeb(window.tronWeb);

        this.setState({address: await Utils.tronWeb.defaultAddress.base58});
        await this.getData();
        this.getUserUpwardReferral();
        this.setUserOwnReferralAddress();
        this.checkResources();
    }

    checkTronLink = async () => {
        // await this.componentDidMount();
        console.log(this.state.tronWeb.loggedIn);
        if (this.state.tronWeb.installed === false) {
            Swal.fire(
                'Please install TronLink',
                'In order to play this game you must install TronLink or TronPay or other Tron wallets.');
        } else if (this.state.tronWeb.loggedIn === undefined) {
            Swal.fire(
                'Please log into TronLink',
                'TronLink is installed but you must first log in. ' +
                'Open TronLink from the browser bar and set up your first wallet or decrypt a previously-created wallet.');
        }
    };

    drawerToggleClickHandler = () => {
        this.setState((prevState) => {
            return {sideDrawerOpen: !prevState.sideDrawerOpen}
        })
    };
    backdropClickHandler = () => {
        this.setState({sideDrawerOpen: false});
    };
    getUserUpwardReferral = () => {
        var e = window.location.href;
        if (new URL(e).searchParams.get("ref")) {
            var t = new URL(e).searchParams.get("ref");
            if (t !== null) {
                t = t.trim().replace(/[^\u0000-\u007E]/g, "");
                Utils.tronWeb.isAddress(t) ? this.setState({upwardReferralAddress: t.toString()}) : Swal.fire(
                    'Invalid referral address',
                    'Please check your address',
                    'error')
            }
        } else {
            this.setState({upwardReferralAddress: this.state.address});
        }
    };
    setUserOwnReferralAddress = () => {
        var referralAddress = "localhost:3000/?ref=" + this.state.address;
        this.setState({userReferralAddress: referralAddress})
    };
    getData = async () => {
        this.getUserTronBalance();
        this.getUserDividendsBalance();
        this.getUserTokenBalance();
        this.getContractTronBalance();
        this.getContractTotalTokenSupply();
        this.getBuyPrice();
        this.getSellPrice();
    };
    checkResources = async () => {
        let tronWeb = window.tronWeb;
        var e = tronWeb.fromSun(await tronWeb.trx.getBalance())
            , t = await tronWeb.trx.getBandwidth()
            , r = await tronWeb.trx.getAccountResources()
            , a = r.EnergyLimit - r.EnergyUsed;
        return e < 10 ? (Swal(`Unsafe TRX balance for transaction processing: ${e} (minimum 10 TRX)`),
            !1) : t < 500 ? (Swal(`Unsafe bandwidth for transaction processing: ${t} (minimum 500, freeze for bandwidth)`),
            !1) : !(a < 2e3) || (Swal(`Unsafe energy for transaction processing: ${a} (minimum 2000, freeze for energy)`),
            !1)
    };
    copyToClipboard = (str) => {
        const el = document.createElement('textarea');
        el.value = str;
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy')
            ? Swal.fire('Link copied') : Swal.fire('Link copy failed', 'error');
        document.body.removeChild(el);
    };
    numberWithCommas = (number) => {
        var parts = number.toString().split(".");
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        return parts.join(".");
    };


    buyToken = string => {
        Utils.contract.buy(this.state.referralAddress).send({
            shouldPollResponse: true,
            callValue: Number(string) * 1e6
        }).then(res => Swal({
            title: 'Tokens purchased',
            type: 'success'
        })).catch(err => Swal({
            title: 'Purchase failed',
            type: 'error'
        })).then(result => {
            console.log('- buyToken:\n' + JSON.stringify(result, null, 2), '\n');
            this.getData();
        });
    };

    reinvest = () => {
        Utils.contract.reinvest().send({
            shouldPollResponse: true
        }).then(res => Swal({
            title: 'Dividends reinvested',
            type: 'success'
        })).catch(err => Swal({
            title: 'Dividends reinvesting failed',
            type: 'error'
        })).then(result => {
            console.log('- Reinvest:\n' + JSON.stringify(result, null, 2), '\n');
            this.getData();
        });
    };

    sellToken = string => {
        Utils.contract.sell(Number(string) * 1e6).send({
            shouldPollResponse: true
        }).then(res => Swal({
            title: 'Tokens sold',
            type: 'success'
        })).catch(err => Swal({
            title: 'Tokens selling failed',
            type: 'error'
        })).then(result => {
            console.log('- sellToken:\n' + JSON.stringify(result, null, 2), '\n');
            this.getData();
        });
    };

    withdraw = () => {
        Utils.contract.withdraw().send({
            shouldPollResponse:true
        }).then(res => Swal({
            title: 'Earnings withdrawn',
            type: 'success'
        })).catch(err => Swal({
            title: 'Withdrawal failed' + err,
            type: 'error',
        })).then(result => {
            console.log('- withdraw:\n' + JSON.stringify(result, null, 2), '\n');
            this.getData();
            // this.getData();
        }).catch(err => {
            console.log(JSON.stringify(err));
        });
    };

    //////// getters ////////

    // refresh user's userTronBalance in wallet, this doesn't need to be in UI as Tronlink (the wallet extension) shows it
    getUserTronBalance = async () => {
        this.state.address && (this.setState(
            {userTronBalance : await Utils.tronWeb.trx.getBalance(this.address) / 1e6}));
    };

    getContractTronBalance = async () => {
        this.state.address && Utils.contract.totalTronBalance().call().then(output => {
            // console.log('- Output:', output, '\n');
            this.setState({contractTronBalance: Number(output.toString()) / 1e6});
            console.groupEnd();
        });
    };

    /**
     * Retrieve the total token supply.
     */
    getContractTotalTokenSupply = async () => {
        Utils.contract.totalSupply().call().then(output => {
            // console.log("get total token supply succeeded");
            this.setState({contractTokenBalance: Number(output.toString()) / 1e6});
        }).catch(e => {
            console.log("error： ", e);
        });
    };

    /**
     * Retrieve the tokens owned by the caller.
     */
    getUserTokenBalance = async () => {
        Utils.contract.myTokens().call({
            shouldPollResponse: true
        }).then(result => {
            this.setState({userTokenBalance: Number(result.toString()) / 1e6})
            // console.log('- getUserTokenBalance:\n' + JSON.stringify(result, null, 2), '\n');
        }).catch(e => {
            console.log('Error in getUserTokenBalance: ' , e);
        })
    };

    getUserDividendsBalance  = async () => {
        Utils.contract.myDividends(true).call({
            shouldPollResponse: true
        }).then(result => {
            this.setState({userDividendsBalance: Number(result.toString()) / 1e6})
            // console.log('- getUserDividendsBalance:\n' + JSON.stringify(result, null, 2), '\n');
        }).catch(e => {
            console.log('Error in getUserDividendsBalance: ' , e)
        });

    };

    getSellPrice = async () => {

        Utils.contract.sellPrice().call({
            shouldPollResponse: true
        }).then(result => {
            this.setState({sellingPrice:
                    Number(result.toString()) / 1e6
                })
        });

    };

    getBuyPrice = async () => {
        Utils.contract.buyPrice().call({
            shouldPollResponse: true
        }).then(result => {
            this.setState({buyingPrice:
                    Number(result.toString()) / 1e6
                })
        });
    };

    calculateTokensReceived = amount => {

        Utils.contract.calculateTokensReceived(Number(amount) * 1e6).call({
            shouldPollResponse:true
        }).then(result => {
            this.setState({estimateTokensToBeReceived:
                    Number(result.toString()) / 1e6})
        }).catch(e => {
            // do nothing
        });

    };

    calculateTronReceived = amount => {
        Utils.contract.calculateTronReceived(Number(amount) * 1e6).call({
            shouldPollResponse:true
        }).then(result => {
            this.setState({estimateTronsToBeReceived:
                    Number(result.toString()) / 1e6})
        }).catch(e => {
            // do nothing
        })

    };

    // internal

    renderGame() {
        if (!this.state.tronWeb.installed)
            return (
                <Container>
                    <TronLinkGuide/>
                </Container>
            );

        if (!this.state.tronWeb.loggedIn)
            return (
                <Container>
                    <TronLinkGuide installed/>
                </Container>
            );

        return (

            <div className="user-stats">

                <Row>
                    <Col className="buy-column">
                        <div className="buy-title">
                            Buy
                        </div>
                        <div className="price-and-available">
                            <div className="price">
                                <span className="heading">User TRX balance in Wallet</span>
                                <div className="field">
                                    <span>{this.state.userTronBalance.toFixed(0)} TRX</span>
                                </div>
                            </div>
                            <div className="available">
                                <span className="heading">Buy Price of Token</span>
                                <div className="field">
                                    <span>1 token = {this.state.buyingPrice.toFixed(2)} TRX</span>
                                </div>
                            </div>
                        </div>

                        <BuyForm
                            onSubmit={(amount) => this.buyToken(amount)}
                            onChange={(amount) => this.calculateTokensReceived(amount)}
                            estimateTokensToBeReceived={this.state.estimateTokensToBeReceived.toFixed(2)}
                        />

                    </Col>
                    <Col className="sell-column">
                        <div className="sell-title">
                            Sell
                        </div>
                        <div className="price-and-available">
                            <div className="price">
                                <span className="heading">User token balance in Contract</span>
                                <div className="field">
                                    <span>{this.state.userTokenBalance} token</span>
                                </div>
                            </div>
                            <div className="available">
                                <span className="heading">Sell Price of Token</span>
                                <div className="field">
                                    <span>1 token = {this.state.sellingPrice.toFixed(2)} TRX</span>
                                </div>
                            </div>
                        </div>

                        <SellForm
                            onSubmit={(amount) => this.sellToken(amount)}
                            onChange={(amount) => this.calculateTronReceived(amount)}
                            estimateTronsToBeReceived={this.state.estimateTronsToBeReceived.toFixed(2)}
                        />
                    </Col>

                </Row>
            </div>
        )
    }

    render() {
        let backdrop;

        if (this.state.sideDrawerOpen) {
            backdrop = <Backdrop click={this.backdropClickHandler}/>
        }

        return (

            <div>
                <div className="App">
                    {/*<Header/>*/}
                    <Toolbar drawerClickHandler={this.drawerToggleClickHandler} />
                    <SideDrawer show={this.state.sideDrawerOpen}/>
                    {backdrop}

                    <Container className="content">


                        {/**
                        * front page section
                        */}

                        <div className="front-page__heading">
                            P3D Clone
                        </div>
                        <div className="front-page__caption">
                            A CLONE OF P3D ON TRON <br />
                            PLAYABLE ON SHASTA TESTNET
                        </div>


                        <nav className="center-row">
                            <div className="buttons">
                                <Button
                                    className="btn btn-outline-secondary"
                                    href='/showcase-p3d/'
                                    target="_blank"
                                >View on Tronscan</Button>
                            </div>
                            <span>&nbsp;&nbsp;</span>
                            <div className="buttons">
                                <Button
                                    className="btn btn-outline-secondary"
                                    href='https://github.com/zscc/showcase-p3d'
                                    target="_blank"
                                >View Github Code
                                </Button>
                            </div>
                        </nav>

                        <Row className="front-page__icons">


                            <Col className="front-page__icons_each_block">
                                <img
                                    alt="appreciation"
                                    src={PricePic}/>
                                <div>
                                    <h4>Value Appreciation</h4>
                                </div>
                            </Col>
                            <Col className="front-page__icons_each_block">
                                <img
                                    alt="Dividends"
                                    src={DividendsPic}/>
                                <div>
                                    <h4>Dividends from Network</h4>
                                </div>
                            </Col>

                            <Col className="front-page__icons_each_block">
                                <img
                                    alt="Commissions"
                                    src={CommissionPic}/>
                                <div>
                                    <h4>Commission from Network</h4>
                                </div>
                            </Col>
                        </Row>




                        {/**
                         * game stats
                         * */}

                        <div className="game-stats">
                            <h1 className="heading">
                                Game Stats
                            </h1>


                            <Row className="game-stats__row">
                                <Col className="game-stats__item">
                                    <Row className="game-stats__item__row">
                                        <Col className="game-stats__item__col">
                                            <h4>Initial Price of Token</h4>
                                            <p>0.01</p>
                                        </Col>
                                        <Col className="game-stats__item__col">
                                            <h4>Current Price of Token</h4>
                                            <p>{this.state.buyingPrice.toFixed(2)}</p>
                                        </Col>
                                    </Row>
                                </Col>


                                <Col className="game-stats__item">
                                    <Row className="game-stats__item__row">
                                        <Col className="game-stats__item__col">
                                            <h4>TRX in Contract</h4>
                                            <p>{this.numberWithCommas(this.state.contractTronBalance.toFixed(0))}</p>
                                        </Col>
                                        <Col className="game-stats__item__col">
                                            <h4>Token in Contract</h4>
                                            <p>{this.state.contractTokenBalance.toFixed(2)}</p>
                                        </Col>
                                    </Row>
                                </Col>
                            </Row>
                        </div>


                        {/**
                         * user stats
                         */}

                        <div className="user-stats">
                            <h1 className="heading">
                                Play Now
                            </h1>
                            {this.renderGame()}
                        </div>


                        <Row>

                            <Col className="earnings-column">
                                <div className="title">
                                    <span>Your Earning from Network</span>
                                </div>
                                <div className="number--TRX">
                                    <span>{this.state.userDividendsBalance} TRX</span>
                                </div>

                                <Container className="buttons">
                                    <Button variant="success" onClick={() => this.reinvest()}>Reinvest</Button>
                                    <span>&nbsp;&nbsp;</span>
                                    <Button variant="danger" onClick={() => this.withdraw()}>Withdraw</Button>
                                </Container>
                            </Col>


                            <Col className="referral-column">
                                <div className="title">
                                    <span>Your Referral Link</span>
                                </div>

                                <div className="address">
                                    <span
                                        id="userReferralAddress"
                                        className="userReferralAddress">{this.state.userReferralAddress}</span>
                                    <br/>
                                </div>
                                <div className="description">
                                    <span>You need to hold at least 50 tokens to be able to receive referral bonus.</span>
                                </div>
                                <div>
                                    <button
                                        className="btn-outline-secondary btn-sm"
                                        onClick={() => this.copyToClipboard(this.state.userReferralAddress)}>
                                        Copy Link
                                    </button>
                                </div>
                            </Col>




                        </Row>




                        <Container className="communities">

                            <p className="header">
                                Communities
                            </p>
                            <Row>

                                <Col>
                                    <a href='/showcase-p3d/'>
                                        <img
                                            className="logos"
                                            alt="Telegram"
                                            src={TelegramLogo}/>


                                        <div>
                                            <p>Telegram</p>
                                        </div>
                                    </a>
                                </Col>
                                <Col>
                                    <a href='/showcase-p3d/'>
                                        <img
                                            className="logos"
                                            alt="Discord"
                                            src={DiscordLogo}/>
                                        <div>
                                            <p>Discord</p>
                                        </div>
                                    </a>
                                </Col>
                                <Col>
                                    <a href='/showcase-p3d/'>
                                        <img
                                            className="logos"
                                            alt="GuildChat"
                                            src={GuildChatLogo}/>
                                        <div>
                                            <p>Guild Chat</p>
                                        </div>
                                    </a>


                                </Col>
                            </Row>

                        </Container>


                    </Container>


                    <Footer />

                </div>
            </div>


        );
    }

}

export default App;