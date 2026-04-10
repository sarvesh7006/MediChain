const StorageProof = artifacts.require("StorageProof");

module.exports = function(deployer) {
  deployer.deploy(StorageProof);
};
