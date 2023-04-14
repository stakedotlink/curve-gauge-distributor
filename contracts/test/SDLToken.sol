// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract SDLToken is ERC20 {
    constructor(string memory _tokenName, string memory _tokenSymbol, uint256 _totalSupply) ERC20(_tokenName, _tokenSymbol) {
        _mint(msg.sender, _totalSupply * (10 ** uint256(decimals())));
    }
}
