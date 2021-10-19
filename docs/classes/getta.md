[Documentation](../README.md) › [Getta](getta.md)

# Class: Getta

## Hierarchy

* **Getta**

## Index

### Constructors

* [constructor](getta.md#constructor)

### Accessors

* [cache](getta.md#cache)

### Methods

* [createShortcut](getta.md#createshortcut)
* [delete](getta.md#delete)
* [get](getta.md#get)
* [post](getta.md#post)
* [put](getta.md#put)

## Constructors

###  constructor

\+ **new Getta**(`options`: [ConstructorOptions](../interfaces/constructoroptions.md)): *[Getta](getta.md)*

*Defined in [src/main.ts:71](https://github.com/badbatch/getta/blob/27ab9b0/src/main.ts#L71)*

**Parameters:**

Name | Type |
------ | ------ |
`options` | [ConstructorOptions](../interfaces/constructoroptions.md) |

**Returns:** *[Getta](getta.md)*

## Accessors

###  cache

• **get cache**(): *Cachemap | undefined*

*Defined in [src/main.ts:109](https://github.com/badbatch/getta/blob/27ab9b0/src/main.ts#L109)*

**Returns:** *Cachemap | undefined*

## Methods

###  createShortcut

▸ **createShortcut**(`name`: string, `path`: string, `__namedParameters`: object): *void*

*Defined in [src/main.ts:113](https://github.com/badbatch/getta/blob/27ab9b0/src/main.ts#L113)*

**Parameters:**

▪ **name**: *string*

▪ **path**: *string*

▪ **__namedParameters**: *object*

Name | Type |
------ | ------ |
`method` | "get" &#124; "post" &#124; "put" &#124; "delete" |
`rest` | rest |

**Returns:** *void*

___

###  delete

▸ **delete**(`path`: string, `options`: [RequestOptions](../interfaces/requestoptions.md)): *Promise‹[FetchResponse](../interfaces/fetchresponse.md)›*

*Defined in [src/main.ts:124](https://github.com/badbatch/getta/blob/27ab9b0/src/main.ts#L124)*

**Parameters:**

Name | Type | Default |
------ | ------ | ------ |
`path` | string | - |
`options` | [RequestOptions](../interfaces/requestoptions.md) | {} |

**Returns:** *Promise‹[FetchResponse](../interfaces/fetchresponse.md)›*

___

###  get

▸ **get**(`path`: string, `options`: [RequestOptions](../interfaces/requestoptions.md)): *Promise‹[FetchResponse](../interfaces/fetchresponse.md) | object›*

*Defined in [src/main.ts:128](https://github.com/badbatch/getta/blob/27ab9b0/src/main.ts#L128)*

**Parameters:**

Name | Type | Default |
------ | ------ | ------ |
`path` | string | - |
`options` | [RequestOptions](../interfaces/requestoptions.md) | {} |

**Returns:** *Promise‹[FetchResponse](../interfaces/fetchresponse.md) | object›*

___

###  post

▸ **post**(`path`: string, `options`: Required‹[RequestOptions](../interfaces/requestoptions.md), "body"›): *Promise‹[FetchResponse](../interfaces/fetchresponse.md)›*

*Defined in [src/main.ts:132](https://github.com/badbatch/getta/blob/27ab9b0/src/main.ts#L132)*

**Parameters:**

Name | Type |
------ | ------ |
`path` | string |
`options` | Required‹[RequestOptions](../interfaces/requestoptions.md), "body"› |

**Returns:** *Promise‹[FetchResponse](../interfaces/fetchresponse.md)›*

___

###  put

▸ **put**(`path`: string, `options`: Required‹[RequestOptions](../interfaces/requestoptions.md), "body"›): *Promise‹[FetchResponse](../interfaces/fetchresponse.md)›*

*Defined in [src/main.ts:136](https://github.com/badbatch/getta/blob/27ab9b0/src/main.ts#L136)*

**Parameters:**

Name | Type |
------ | ------ |
`path` | string |
`options` | Required‹[RequestOptions](../interfaces/requestoptions.md), "body"› |

**Returns:** *Promise‹[FetchResponse](../interfaces/fetchresponse.md)›*
