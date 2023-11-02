// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract CIDRegistry {
  string public cid;
  address public owner;
  event CIDRegistered(string cid);

  constructor() {
    owner = msg.sender;
  }

  function registerCID(string memory cidNew) public {
    require(msg.sender == owner, "Only owner can register CID");
    cid = cidNew;
    emit CIDRegistered(cid);
  }

  function getCID() public view returns (string memory) {
    return cid;
  }
}
