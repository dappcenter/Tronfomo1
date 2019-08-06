var TronGame = artifacts.require("./TronGame.sol");

module.exports = function(deployer) {
  deployer.deploy(TronGame);
};
