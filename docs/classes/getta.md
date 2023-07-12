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

*Defined in [src/main.ts:84](https://github.com/badbatch/getta/blob/317b60c/src/main.ts#L84)*

**Parameters:**

Name | Type |
------ | ------ |
`options` | [ConstructorOptions](../interfaces/constructoroptions.md) |

**Returns:** *[Getta](getta.md)*

## Accessors

###  cache

• **get cache**(): *Cachemap | undefined*

*Defined in [src/main.ts:130](https://github.com/badbatch/getta/blob/317b60c/src/main.ts#L130)*

**Returns:** *Cachemap | undefined*

## Methods

###  createShortcut

▸ **createShortcut**(`name`: string, `path`: string, `__namedParameters`: object): *void*

*Defined in [src/main.ts:134](https://github.com/badbatch/getta/blob/317b60c/src/main.ts#L134)*

**Parameters:**

▪ **name**: *string*

▪ **path**: *string*

▪ **__namedParameters**: *object*

Name | Type |
------ | ------ |
`method` | "get" &#124; "post" &#124; "put" &#124; "delete" |
`otherOptions` | otherOptions |

**Returns:** *void*

___

###  delete

▸ **delete**(`path`: string, `options`: Omit‹[RequestOptions](../interfaces/requestoptions.md), "method"›, `context?`: PlainObject): *Promise‹[FetchResponse](../interfaces/fetchresponse.md)‹PlainObject››*

*Defined in [src/main.ts:150](https://github.com/badbatch/getta/blob/317b60c/src/main.ts#L150)*

**Parameters:**

Name | Type | Default |
------ | ------ | ------ |
`path` | string | - |
`options` | Omit‹[RequestOptions](../interfaces/requestoptions.md), "method"› | {} |
`context?` | PlainObject | - |

**Returns:** *Promise‹[FetchResponse](../interfaces/fetchresponse.md)‹PlainObject››*

___

###  get

▸ **get**(`path`: string, `options`: Omit‹[RequestOptions](../interfaces/requestoptions.md), "method"›, `context?`: PlainObject): *Promise‹[FetchResponse](../interfaces/fetchresponse.md)‹PlainObject› | object›*

*Defined in [src/main.ts:154](https://github.com/badbatch/getta/blob/317b60c/src/main.ts#L154)*

**Parameters:**

Name | Type | Default |
------ | ------ | ------ |
`path` | string | - |
`options` | Omit‹[RequestOptions](../interfaces/requestoptions.md), "method"› | {} |
`context?` | PlainObject | - |

**Returns:** *Promise‹[FetchResponse](../interfaces/fetchresponse.md)‹PlainObject› | object›*

___

###  post

▸ **post**(`path`: string, `options`: Omit‹Required‹[RequestOptions](../interfaces/requestoptions.md), "body"›, "method"›, `context?`: PlainObject): *Promise‹[FetchResponse](../interfaces/fetchresponse.md)‹PlainObject››*

*Defined in [src/main.ts:158](https://github.com/badbatch/getta/blob/317b60c/src/main.ts#L158)*

**Parameters:**

Name | Type |
------ | ------ |
`path` | string |
`options` | Omit‹Required‹[RequestOptions](../interfaces/requestoptions.md), "body"›, "method"› |
`context?` | PlainObject |

**Returns:** *Promise‹[FetchResponse](../interfaces/fetchresponse.md)‹PlainObject››*

___

###  put

▸ **put**(`path`: string, `options`: Omit‹Required‹[RequestOptions](../interfaces/requestoptions.md), "body"›, "methood"›, `context?`: PlainObject): *Promise‹[FetchResponse](../interfaces/fetchresponse.md)‹PlainObject››*

*Defined in [src/main.ts:162](https://github.com/badbatch/getta/blob/317b60c/src/main.ts#L162)*

**Parameters:**

Name | Type |
------ | ------ |
`path` | string |
`options` | Omit‹Required‹[RequestOptions](../interfaces/requestoptions.md), "body"›, "methood"› |
`context?` | PlainObject |

**Returns:** *Promise‹[FetchResponse](../interfaces/fetchresponse.md)‹PlainObject››*
