export const constantsTmpl = `export const CHAIN_ID = {{chainId}};
export const TOKEN_TYPE_ETHER = 0;
export const TOKEN_TYPE_ERC20 = 1;
export { ERC20 } from "./ERC20";
export { ERC20NameBytes } from "./ERC20NameBytes";
export { ERC20SymbolBytes } from "./ERC20SymbolBytes";
`
export const constantsTmplV1 = `export let MASK_CONTRACT_ADDRESS_LIST = new Array<string>({{contracts.length}});

{{#contracts}}
    {{#is_mask}}
// its real mask contract address
MASK_CONTRACT_ADDRESS_LIST.push("{{address}}");
    {{/is_mask}}
    {{^is_mask}}
// its placeholder to meet the declared array length
MASK_CONTRACT_ADDRESS_LIST.push("0x0");
    {{/is_mask}}
{{/contracts}}

export const GENESIS_TIMESTAMP = 1609372800; // UNIX timestamp
export const GENESIS_TIMESTAMP_MASK = 1613088000; // UNIX timestamp

`

export const constantsTmplV2 = `export const GENESIS_TIMESTAMP = 1616976000; // UNIX timestamp
export const GENESIS_TIMESTAMP_MASK = 1613088000; // UNIX timestamp

`
