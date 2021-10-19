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

*Defined in [src/main.ts:70](https://github.com/badbatch/getta/blob/ed88658/src/main.ts#L70)*

**Parameters:**

Name | Type |
------ | ------ |
`options` | [ConstructorOptions](../interfaces/constructoroptions.md) |

**Returns:** *[Getta](getta.md)*

## Accessors

###  cache

• **get cache**(): *Cachemap | undefined*

*Defined in [src/main.ts:108](https://github.com/badbatch/getta/blob/ed88658/src/main.ts#L108)*

**Returns:** *Cachemap | undefined*

## Methods

###  createShortcut

▸ **createShortcut**(`name`: string, `path`: string, `__namedParameters`: object): *void*

*Defined in [src/main.ts:112](https://github.com/badbatch/getta/blob/ed88658/src/main.ts#L112)*

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

▸ **delete**(`path`: string, `options`: [RequestOptions](../interfaces/requestoptions.md)): *Promise‹[FetchResponse](../interfaces/fetchresponse.md)‹PlainObject››*

*Defined in [src/main.ts:123](https://github.com/badbatch/getta/blob/ed88658/src/main.ts#L123)*

**Parameters:**

Name | Type | Default |
------ | ------ | ------ |
`path` | string | - |
`options` | [RequestOptions](../interfaces/requestoptions.md) | {} |

**Returns:** *Promise‹[FetchResponse](../interfaces/fetchresponse.md)‹PlainObject››*

___

###  get

▸ **get**(`path`: string, `options`: [RequestOptions](../interfaces/requestoptions.md)): *Promise‹[FetchResponse](../interfaces/fetchresponse.md)‹PlainObject› | object›*

*Defined in [src/main.ts:127](https://github.com/badbatch/getta/blob/ed88658/src/main.ts#L127)*

**Parameters:**

Name | Type | Default |
------ | ------ | ------ |
`path` | string | - |
`options` | [RequestOptions](../interfaces/requestoptions.md) | {} |

**Returns:** *Promise‹[FetchResponse](../interfaces/fetchresponse.md)‹PlainObject› | object›*

___

###  post

▸ **post**(`path`: string, `options`: Required‹[RequestOptions](../interfaces/requestoptions.md), "body"›): *Promise‹[FetchResponse](../interfaces/fetchresponse.md)‹PlainObject››*

*Defined in [src/main.ts:131](https://github.com/badbatch/getta/blob/ed88658/src/main.ts#L131)*

**Parameters:**

Name | Type |
------ | ------ |
`path` | string |
`options` | Required‹[RequestOptions](../interfaces/requestoptions.md), "body"› |

**Returns:** *Promise‹[FetchResponse](../interfaces/fetchresponse.md)‹PlainObject››*

___

###  put

▸ **put**(`path`: string, `options`: Required‹[RequestOptions](../interfaces/requestoptions.md), "body"›): *Promise‹[FetchResponse](../interfaces/fetchresponse.md)‹PlainObject››*

*Defined in [src/main.ts:135](https://github.com/badbatch/getta/blob/ed88658/src/main.ts#L135)*

**Parameters:**

Name | Type |
------ | ------ |
`path` | string |
`options` | Required‹[RequestOptions](../interfaces/requestoptions.md), "body"› |

**Returns:** *Promise‹[FetchResponse](../interfaces/fetchresponse.md)‹PlainObject››*
