import React from 'react'

import Button from 'react-bootstrap/Button';
import Container from 'react-bootstrap/Container'

import './BuyForm.scss';



class BuyForm extends React.Component {

    state = {
        amount: "",

    };

    change = e => {
        // this.props.onChange(this.state.amount);
        this.setState({
            [e.target.name]: e.target.value
        })
        this.props.onChange(e.target.value);
    };


    onSubmit = e => {
        e.preventDefault();

        // find out whether there should be parameter
        this.props.onSubmit(this.state.amount);
        this.setState({
            amount: ""
        })
    };


    render() {
        return (

            <form>

                <Container className="form-container">

                    <div className="form-title">
                        Enter amount of TRX you wish to spend
                    </div>

                    <input
                        className="user-input"
                        type="number"
                        min="0"
                        name="amount"
                        value={this.state.amount}
                        onChange={ e => this.change(e)}
                    />
                    <span className="estimate-sign"> &nbsp;≈</span>

                    <div className="estimate-data">
                        <span className="estimate token">token</span>
                        <span className="estimate">{this.props.estimateTokensToBeReceived}<span>&nbsp;</span></span>
                    </div>
                    <div>
                        <Button
                            className="form-button"
                            variant="success"
                            onClick={e => this.onSubmit(e)}>Buy</Button>
                    </div>

                </Container>

            </form>

        )
    }
}

export default BuyForm;