#### 1.0.6 (2024-07-13)

##### Bug Fixes

*  not handing falsy values in template data (fbb412d0)

#### 1.0.5 (2024-01-12)

##### Chores

*  upgrade deps (5e9e426f)
* **deps-dev:**  bump follow-redirects from 1.15.3 to 1.15.4 (59e1ee82)

#### 1.0.4 (2023-12-17)

##### Bug Fixes

*  typo in readme (66cbd728)

#### 1.0.3 (2023-12-17)

##### Refactors

*  improve cjs support (bafe2760)

#### 1.0.2 (2023-11-23)

##### Chores

*  upgrade dep (ca9dfece)
*  bump version of fetch-mocked (ed77ccad)
* **deps-dev:**  bump crypto-js from 4.1.1 to 4.2.0 (1c9c124e)

##### Documentation Changes

*  whitespace issue (ade8a2c6)

##### New Features

*  move to exports map in package json and upgrade deps (0b779b96)

##### Refactors

*  use node-fetch polyfil from fetch-mocked (f62e959c)

#### 1.0.1 (2023-10-17)

##### Documentation Changes

*  minor readme update (054450db)

#### 1.0.0 (2023-10-16)

##### Documentation Changes

*  update readme (e753cd34)
*  add usage guide (f1e85ec7)
*  minor readme update (911d95c3)

##### New Features

*  move code and tests to esm (272357a1)

#### 0.4.7 (2023-08-13)

##### Bug Fixes

*  output mjs files for module ([de027423](https://github.com/badbatch/getta/commit/de027423088da3a47346ef9c837f96481a04924b))

#### 0.4.6 (2023-07-12)

##### Refactors

*  change lib default export to nameed ([389830fa](https://github.com/badbatch/getta/commit/389830faab370064f69b80a28b34fd2bcbe8cd52))

#### 0.4.5 (2023-07-12)

##### Bug Fixes

*  move peers to deps ([317b60c4](https://github.com/badbatch/getta/commit/317b60c46ec2628e04e90c6343372a3a54069c0f))

#### 0.4.4 (2022-11-16)

##### Bug Fixes

*  clear timeout timer when request added to rate limit queue ([51b6e0af](https://github.com/badbatch/getta/commit/51b6e0aff926a2e62cafc31a0d9f526daf05fff2))

#### 0.4.3 (2022-11-15)

##### Bug Fixes

*  await promise to catch error ([201e04c7](https://github.com/badbatch/getta/commit/201e04c765cd447efbd8a54cb87f65c019d76bfb))

#### 0.4.2 (2022-10-25)

##### Bug Fixes

*  context passing into shorthand methods ([56cb1c3c](https://github.com/badbatch/getta/commit/56cb1c3c01a38f29bb942720ca2d6a053abd25e5))

#### 0.4.1 (2022-10-24)

##### Refactors

*  update logging ([addf14cc](https://github.com/badbatch/getta/commit/addf14cc344ed31aa409ea564cae15bb3f5d2b08))

### 0.4.0 (2022-10-23)

##### New Features

*  add logging ([2655d942](https://github.com/badbatch/getta/commit/2655d9429ce054e45998a080b3510a92c61240f9))

### 0.3.0 (2022-06-28)

##### New Features

*  add rate limiting ([f8275dd8](https://github.com/badbatch/getta/commit/f8275dd83608743bb587df9305cc85936678bced))

#### 0.2.3 (2022-06-27)

##### Refactors

*  reorder code to make debugging easier ([3b3b89e7](https://github.com/badbatch/getta/commit/3b3b89e7177ff620a6dd35bb04d4b254d132c524))

#### 0.2.2 (2022-06-24)

##### Bug Fixes

*  add second attempt to parse body when invalid json ([5a27b0ef](https://github.com/badbatch/getta/commit/5a27b0eff2855bec70d0d54cf75b8b53e71d076f))

#### 0.2.1 (2022-06-06)

##### Bug Fixes

*  catch response parsing error correctly ([07871c37](https://github.com/badbatch/getta/commit/07871c37979bcd02933d4e610e18e8c68b06532f))

### 0.2.0 (2022-06-01)

##### New Features

*  enable method overriding on shortcut properties ([053c3556](https://github.com/badbatch/getta/commit/053c35567d717d6e56c9ae4ed46c73af622b1734))

#### 0.1.22 (2022-04-01)

##### Chores

*  upgrade cachemap deps ([97864a27](https://github.com/badbatch/getta/commit/97864a2728961f4937a441c36188750508d466be))

#### 0.1.21 (2022-01-21)

##### Chores

* **deps:**
  *  bump trim-off-newlines from 1.0.1 to 1.0.3 ([a0393578](https://github.com/badbatch/getta/commit/a0393578be20485d901bf0f5757dedda213718dd))
  *  bump ws from 7.4.5 to 7.5.6 ([a305a8c9](https://github.com/badbatch/getta/commit/a305a8c9bfc6e5b3240d019f99e5fbb5025d5e90))
  *  bump shelljs from 0.8.4 to 0.8.5 ([040c8a16](https://github.com/badbatch/getta/commit/040c8a164f4a8333a419cec6f6b6ab0048ab16e7))
  *  bump tmpl from 1.0.4 to 1.0.5 ([aafc23ec](https://github.com/badbatch/getta/commit/aafc23ec2555e6b85f7e4813dd6f37090e746237))
  *  bump semver-regex from 3.1.2 to 3.1.3 ([1ba20153](https://github.com/badbatch/getta/commit/1ba201531d39946909fc14ce5da201d65d86b0e3))
  *  bump path-parse from 1.0.6 to 1.0.7 ([7b6ec209](https://github.com/badbatch/getta/commit/7b6ec209b3413563b88eb0174bca8e81126e6d4c))
  *  bump underscore from 1.9.1 to 1.13.1 ([d150d17a](https://github.com/badbatch/getta/commit/d150d17a2842738d17a9fddf39153af33c48025d))
  *  bump highlight.js from 9.18.1 to 9.18.5 ([314b8244](https://github.com/badbatch/getta/commit/314b824448a5a78c1a8b129d3e979d1b7fa1d5b4))

##### Bug Fixes

*  header key format when adding cache control ([7bd74d3f](https://github.com/badbatch/getta/commit/7bd74d3f964dd87a808f76ae7598bcc73ab9775c))

#### 0.1.20 (2022-01-21)

##### Bug Fixes

*  return headers with cache control if match found in cache ([be4e6c9b](https://github.com/badbatch/getta/commit/be4e6c9be7b18f73f16533863cdfdfe75fd6feb6))

#### 0.1.19 (2022-01-18)

##### Bug Fixes

*  remove ending forward slash on endpoint if it exists ([23f007cb](https://github.com/badbatch/getta/commit/23f007cb100b0ea209fc42476f07a162ea24e187))

#### 0.1.17 (2021-12-27)

##### Chores

*  upgrade cachemap core package ([f36d5aa1](https://github.com/badbatch/getta/commit/f36d5aa1c08d725b1e36d839d7d284be436390c2))

#### 0.1.16 (2021-12-22)

##### Bug Fixes

*  circular dependency ([301b5cfb](https://github.com/badbatch/getta/commit/301b5cfbdbaf8a29a8250b614c87a15ca831ebfb))

#### 0.1.15 (2021-12-22)

##### Bug Fixes

*  add missing cachemap/controller dev dependency ([1de8279d](https://github.com/badbatch/getta/commit/1de8279d207fb7ed4e7ade01674624de181111d3))

#### 0.1.14 (2021-12-22)

##### Chores

*  bump cachemap dependencies ([b6a07030](https://github.com/badbatch/getta/commit/b6a07030d64db83ac937cab853774175f4d797b7))

#### 0.1.11 (2021-10-19)

##### Bug Fixes

*  update shorthand method signature ([7880912c](https://github.com/badbatch/getta/commit/7880912cbfc9083aa4f41d357a9bba6db7c4ccdf))

#### 0.1.10 (2021-10-19)

##### New Features

*  pass resource type into shorthand method ([1922e959](https://github.com/badbatch/getta/commit/1922e9599389ab75c5d47ccbd761d8b4cdd9ec49))

#### 0.1.9 (2021-10-19)

##### Bug Fixes

*  shortand return type is wrong ([7da27bf0](https://github.com/badbatch/getta/commit/7da27bf0e4207fdfe04f99bae9614bb9103c0c02))

#### 0.1.8 (2021-10-19)

##### Bug Fixes

*  error in deploy script ([e75d9c93](https://github.com/badbatch/getta/commit/e75d9c932886a1a80881bf863145ec351338e0f1))

#### 0.1.7 (2021-10-19)

##### Bug Fixes

*  get build working by removing codecov step ([27ab9b09](https://github.com/badbatch/getta/commit/27ab9b093c880397cb2e3bd4c4fc95a4dea9d507))
*  force correct return signature for shortcut methods ([f6551dc5](https://github.com/badbatch/getta/commit/f6551dc5416a5ba1b1011081b9ed1323ba9e0061))

#### 0.1.6 (2021-05-20)

##### New Features

*  return entire response object with data and errors ([ee6a4213](https://github.com/badbatch/getta/commit/ee6a4213ef2ee3e953bf7897123d755541d48fdf))

#### 0.1.5 (2020-03-03)

##### Chores

*  update dependencies and sort peer versions ([ec4d4b8d](https://github.com/badbatch/getta/commit/ec4d4b8d81c10a2c9e77cf32d1b66208ba28f68a))

#### 0.1.4 (2020-03-02)

##### Bug Fixes

*  change order of query param logic in build endpoint ([f25ed4c9](https://github.com/badbatch/getta/commit/f25ed4c903c37713c02f511f13cf6de83a9ffb0c))

#### 0.1.3 (2020-03-02)

##### Refactors

*  changing test folder name ([9cee1820](https://github.com/badbatch/getta/commit/9cee18200f4327648e2e3eb0a89c6af8f912db1c))

#### 0.1.2 (2019-11-16)

##### Refactors

*  change constant to helper method ([9fb69dda](https://github.com/badbatch/getta/commit/9fb69dda8fcc51627450101c81132d6bbfe73d62))

#### 0.1.1 (2019-11-15)

##### Chores

*  update dependencies, including cachemap ([fa6c8f65](https://github.com/badbatch/getta/commit/fa6c8f651007c2c01377bfc8aac0fa7821cd02cf))

##### Documentation Changes

*  update readme ([42bbfe1f](https://github.com/badbatch/getta/commit/42bbfe1f5eca6a45445715b3b69680dc14a17fca))

### 0.1.0 (2019-11-12)

##### Chores

*  add bootstrap files ([07be80ac](https://github.com/badbatch/getta/commit/07be80ac994fff9b918c4bde5ef230952d30bdd5))

##### Documentation Changes

*  fix links in readme ([20edde8f](https://github.com/badbatch/getta/commit/20edde8fd9e45dc2616e218a1af00c3db72b2434))
*  add readme and fix package json links ([8ca3b843](https://github.com/badbatch/getta/commit/8ca3b84388cc25b2bb0a94e9f5cbbc2e06706f64))
*  adding typedocs ([1c741a77](https://github.com/badbatch/getta/commit/1c741a7781ecc0348ac37699395cc533b16a8e76))

##### New Features

*  add shortcuts to createRestClient method ([9498a105](https://github.com/badbatch/getta/commit/9498a10543ef5f749e82b2eeb09152650253d3e7))
*  finishing rest client and starting unit tests ([9cbf0495](https://github.com/badbatch/getta/commit/9cbf04950955c930d22919df404840764a43f46f))

##### Bug Fixes

*  error in travis config ([5fa09646](https://github.com/badbatch/getta/commit/5fa09646c96e38b648e713af219e98ee48b1bf64))
*  allow shortcut property keys to be passed in ([509886a6](https://github.com/badbatch/getta/commit/509886a624b832f2bb0950414dc9a0ec3b89c8f6))

##### Other Changes

* dylanaubrey/getta into wip ([e0f5886b](https://github.com/badbatch/getta/commit/e0f5886b70d59d7dae63cedb3146318b9fcd90ff))

##### Refactors

*  updating test structure ([13b91f75](https://github.com/badbatch/getta/commit/13b91f751dee71a18561db0f60d630edec2a1da9))
*  moving files over to typescript ([da29e421](https://github.com/badbatch/getta/commit/da29e421499df136f15481fedd308fc9481750ed))

##### Tests

*  finishing unit tests ([add5025f](https://github.com/badbatch/getta/commit/add5025f4362809ddc942ef3cc550ec972733e53))
*  refactor tests and add delete tests ([dd16ac71](https://github.com/badbatch/getta/commit/dd16ac71027c146efc6f1fc86f4771b3e5390c92))
*  finishing get method unit tests ([1f6ca8b5](https://github.com/badbatch/getta/commit/1f6ca8b5d558cb1ee77bd7ed8447c5c44a9796b6))
*  adding redirect unit tests` ([44daefcc](https://github.com/badbatch/getta/commit/44daefccb945f1e0d1ec4761013d9e764cb4d9cc))
*  adding not found status code test ([4f801f3c](https://github.com/badbatch/getta/commit/4f801f3c654ad1242fcae655aaeea7460a6469db))
*  refactor unit test structure ([c9b786d3](https://github.com/badbatch/getta/commit/c9b786d31a6d1bd654aba9cab94319bebe950172))
*  adding tests to get method ([8c08fc8b](https://github.com/badbatch/getta/commit/8c08fc8b2a6017eaf77011855d817f3359891416))

