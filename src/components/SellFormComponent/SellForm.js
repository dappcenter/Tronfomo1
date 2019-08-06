import React from 'react'

import Button from 'react-bootstrap/Button';
import Container from 'react-bootstrap/Container'


class SellForm extends React.Component {
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
                        Enter amount of token you wish to sell
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
                        <span className="estimate token">TRX</span>
                        <span className="estimate">{this.props.estimateTronsToBeReceived}<span>&nbsp;</span></span>
                    </div>
                    <div>
                        <Button
                            className="form-button"
                            variant="danger"
                            onClick={e => this.onSubmit(e)}>Sell</Button>
                    </div>

                </Container>
            </form>



        )
    }
}

export default SellForm;