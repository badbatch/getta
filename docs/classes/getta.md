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

*Defined in [src/main.ts:78](https://github.com/badbatch/getta/blob/f8275dd/src/main.ts#L78)*

**Parameters:**

Name | Type |
------ | ------ |
`options` | [ConstructorOptions](../interfaces/constructoroptions.md) |

**Returns:** *[Getta](getta.md)*

## Accessors

###  cache

• **get cache**(): *Cachemap | undefined*

*Defined in [src/main.ts:120](https://github.com/badbatch/getta/blob/f8275dd/src/main.ts#L120)*

**Returns:** *Cachemap | undefined*

## Methods

###  createShortcut

▸ **createShortcut**(`name`: string, `path`: string, `__namedParameters`: object): *void*

*Defined in [src/main.ts:124](https://github.com/badbatch/getta/blob/f8275dd/src/main.ts#L124)*

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

▸ **delete**(`path`: string, `options`: Omit‹[RequestOptions](../interfaces/requestoptions.md), "method"›): *Promise‹[FetchResponse](../interfaces/fetchresponse.md)‹PlainObject››*

*Defined in [src/main.ts:135](https://github.com/badbatch/getta/blob/f8275dd/src/main.ts#L135)*

**Parameters:**

Name | Type | Default |
------ | ------ | ------ |
`path` | string | - |
`options` | Omit‹[RequestOptions](../interfaces/requestoptions.md), "method"› | {} |

**Returns:** *Promise‹[FetchResponse](../interfaces/fetchresponse.md)‹PlainObject››*

___

###  get

▸ **get**(`path`: string, `options`: Omit‹[RequestOptions](../interfaces/requestoptions.md), "method"›): *Promise‹[FetchResponse](../interfaces/fetchresponse.md)‹PlainObject› | object›*

*Defined in [src/main.ts:139](https://github.com/badbatch/getta/blob/f8275dd/src/main.ts#L139)*

**Parameters:**

Name | Type | Default |
------ | ------ | ------ |
`path` | string | - |
`options` | Omit‹[RequestOptions](../interfaces/requestoptions.md), "method"› | {} |

**Returns:** *Promise‹[FetchResponse](../interfaces/fetchresponse.md)‹PlainObject› | object›*

___

###  post

▸ **post**(`path`: string, `options`: Omit‹Required‹[RequestOptions](../interfaces/requestoptions.md), "body"›, "method"›): *Promise‹[FetchResponse](../interfaces/fetchresponse.md)‹PlainObject››*

*Defined in [src/main.ts:143](https://github.com/badbatch/getta/blob/f8275dd/src/main.ts#L143)*

**Parameters:**

Name | Type |
------ | ------ |
`path` | string |
`options` | Omit‹Required‹[RequestOptions](../interfaces/requestoptions.md), "body"›, "method"› |

**Returns:** *Promise‹[FetchResponse](../interfaces/fetchresponse.md)‹PlainObject››*

___

###  put

▸ **put**(`path`: string, `options`: Omit‹Required‹[RequestOptions](../interfaces/requestoptions.md), "body"›, "methood"›): *Promise‹[FetchResponse](../interfaces/fetchresponse.md)‹PlainObject››*

*Defined in [src/main.ts:147](https://github.com/badbatch/getta/blob/f8275dd/src/main.ts#L147)*

**Parameters:**

Name | Type |
------ | ------ |
`path` | string |
`options` | Omit‹Required‹[RequestOptions](../interfaces/requestoptions.md), "body"›, "methood"› |

**Returns:** *Promise‹[FetchResponse](../interfaces/fetchresponse.md)‹PlainObject››*
