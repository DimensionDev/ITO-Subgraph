export const subgraphYamlTmpl = (hasCallHandlers: boolean) => `specVersion: 0.0.2
schema:
  file: ./schema.graphql
dataSources:
{{#contracts}}
  - kind: ethereum/contract
    name: {{name}}
    network: {{network}}
    source:
      address: "{{address}}"
      abi: {{abi}}
      startBlock: {{startBlock}}
    mapping:
      kind: ethereum/events
      apiVersion: 0.0.4
      language: wasm/assemblyscript
      entities:
        {{#entities}}
          - {{event}}
        {{/entities}}
      abis:
        - name: {{abi}}
          file: ./abis/{{abi}}.json
        - name: ERC20
          file: ./abis/ERC20.json
        - name: ERC20SymbolBytes
          file: ./abis/ERC20SymbolBytes.json
        - name: ERC20NameBytes
          file: ./abis/ERC20NameBytes.json
      ${hasCallHandlers ? 
     `callHandlers:
        {{#callHandlers}}
          - function: {{function}}
            handler: {{handler}}
        {{/callHandlers}}` : ``}
      eventHandlers:
        {{#eventHandlers}}
          - event: {{event}}
            handler: {{handler}}
        {{/eventHandlers}}
      file: ./src/{{mapping}}.ts
{{/contracts}}
`
