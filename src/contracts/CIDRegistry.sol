// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract CIDRegistry {
    bytes public cid;
    address public owner;
    event CIDRegistered(string cid);

    constructor() {
        owner = msg.sender;
    }

    function registerCID(string memory _cid) public {
        require(msg.sender == owner, "Only owner can register CID");
        cid = bytes(_cid);
        emit CIDRegistered(_cid);
    }
}
