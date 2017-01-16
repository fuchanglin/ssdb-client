'use strict';


class SSDBError extends Error { }

const Errors = {
  SSDBError,
  SSDBTaskTimeoutError : class SSDBTaskTimeoutError extends SSDBError {},
  SSDBClientError    : class SSDBClientError extends SSDBError {},
  SSDBFailError      : class SSDBFailError extends SSDBError {},
  SSDBQueryError     : class SSDBQueryError extends SSDBError {},
  SSDBNotFoundError  : class SSDBNotFoundError extends SSDBError {},
  SSDBFatalError     : class SSDBFatalError extends SSDBError {},
};

const ReturnTypes = {
  bool:   Symbol('bool'),
  int:    Symbol('int'),
  float:  Symbol('float'),
  string: Symbol('string'),
  list:   Symbol('list'),
  object: Symbol('object'),
  void:   Symbol('void'),
};

const ResponseStatus = {
  OK:           'ok',
  NotFound:     'not_found',
  Error:        'error',
  Fail:         'fail',
  ClientError:  'client_error'
};

const Commands = {
//------------------------------------------------------------------------------
// Server
//------------------------------------------------------------------------------
  // auth
  // - 向服务器校验访问密码.
  // - 成功返回 ok, 否则返回错误码和错误信息.
  auth: {
    returnType: ReturnTypes.bool,
  },
  // dbsize
  // - 返回数据库占用空间的估计值, 以字节为单位. 如果开启数据压缩, 返回的是压缩后的值.
  // - 以字节为单位的空间大小.
  dbsize: {
    returnType: ReturnTypes.int,
  },
  // flushdb[type]
  // - 删除 SSDB 服务器的所有数据. 可选参数 type 指定删除对应类型的数据.
  //  flushdb: {
  //    returnType: ReturnTypes.void,
  //  },
  // info [opt]
  // - 返回服务器信息的关联数据.
  info: {
    returnType: ReturnTypes.string,
  },

//------------------------------------------------------------------------------
// Key Value
//------------------------------------------------------------------------------

  // set key value
  // - Set the value of the key.
  // - false on error, other values indicate OK.
  set: {
    returnType: ReturnTypes.int,
  },

  // setx key value ttl(number of seconds to live)
  // - Set the value of the key, with a time to live.
  // - false on error, other values indicate OK.
  setx: {
    returnType: ReturnTypes.int,
  },

  // setnx key value
  // - Set the string value in argument as value of the key if and only if the key doesn't exist.
  // - 1: value is set, 0: key already exists.
  setnx: {
    returnType: ReturnTypes.int,
  },

  // expire key ttl
  // - Set the time left to live in seconds, only for keys of KV type.
  // - If the key exists and ttl is set, return 1, otherwise return 0.
  expire: {
    returnType: ReturnTypes.int,
  },

  // ttl key
  // - Returns the time left to live in seconds, only for keys of KV type.
  // - Time to live of the key, in seconds, -1 if there is no associated expire to the key.
  ttl: {
    returnType: ReturnTypes.int,
  },

  // get key
  // - Get the value related to the specified key.
  // - Return the value to the key, if the key does not exists, return not_found Status Code.
  get: {
    returnType: ReturnTypes.string,
  },

  // getset key value
  // - Sets a value and returns the previous entry at that key.
  // - If the key already exists, the value related to that key is returned.
  //   Otherwise return not_found Status Code. The value is either added or updated.
  getset: {
    returnType: ReturnTypes.string,
  },

  // del key
  // - Delete specified key.
  // - Status reply. You can not determine whether the key exists or not by delete command.
  del: {
    returnType: ReturnTypes.void,
  },

  // incr key [num]
  // - Increment the number stored at key by num. The num argument could be a negative integer.
  // - The new value. If the old value cannot be converted to an integer, returns error Status Code.
  incr: {
    returnType: ReturnTypes.int,
  },

  // exists key
  // - Verify if the specified key exists.
  // - If the key exists, return 1, otherwise return 0.
  exists: {
    returnType: ReturnTypes.bool,
  },

  // getbit key offset
  // - Return a single bit out of a string.
  // - 0 or 1.
  getbit: {
    returnType: ReturnTypes.int,
  },

  // setbit key offset val
  // - Changes a single bit of a string. The string is auto expanded.
  // - The value of the bit before it was set: 0 or 1. If val is not 0 or 1, returns false.
  setbit: {
    returnType: ReturnTypes.int,
  },

  // bitcount key [start] [end]
  // - Count the number of set bits (population counting) in a string. Like Redis's bitcount.
  // - The number of bits set to 1.
  bitcount: {
    returnType: ReturnTypes.int,
  },

  // countbit key [start] [size]
  // - Count the number of set bits (population counting) in a string.
  //   Unlike bitcount, it take part of the string by start and size, not start and end.
  // - The number of bits set to 1.
  countbit: {
    returnType: ReturnTypes.int,
  },

  // substr key start size
  // - Return part of a string, like PHP's substr() function.
  // - The extracted part of the string.
  substr: {
    returnType: ReturnTypes.string,
  },

  // strlen key
  // - Return the number of bytes of a string.
  // - The number of bytes of the string, if key not exists, returns 0.
  strlen: {
    returnType: ReturnTypes.int,
  },

  // keys key_start key_end limit
  // - 列出处于区间 (key_start, key_end] 的 key 列表.
  // - 返回 key 的列表.
  keys: {
    returnType: ReturnTypes.list
  },
  // rkeys key_start key_end limit
  // - 列出处于区间 (key_start, key_end] 的 key 列表, 反向.
  // - 返回 key 的列表.
  rkeys: {
    returnType: ReturnTypes.list
  },
  // scan key_start key_end limit
  // - 列出处于区间 (key_start, key_end] 的 key-value 列表.
  //   ("", ""] 表示整个区间.
  // - 返回 key value 依次出现的列表.
  scan: {
    returnType: ReturnTypes.object
  },
  // rscan key_start key_end limit
  // - 列出处于区间 (key_start, key_end] 的 key-value 列表, 反向.
  //   ("", ""] 表示整个区间.
  // - 返回 key value 依次出现的列表.
  rscan: {
    returnType: ReturnTypes.object
  },
  // multi_set key1 value1 key2 value2 ...
  // - 批量设置一批 key-value.
  // - false on error, other values indicate OK.
  multi_set: {
    returnType: ReturnTypes.int,
  },
  // multi_get key1 key2 ...
  // - 批量获取一批 key 对应的值内容.
  // - Key-value list.
  multi_get: {
    returnType: ReturnTypes.object,
  },
  // multi_del key1 key2 ...
  // - 批量删除一批 key 和其对应的值内容.
  // - false on error, other values indicate OK.
  multi_del: {
    returnType: ReturnTypes.int,
  },

//------------------------------------------------------------------------------
// Hashmap
//------------------------------------------------------------------------------
  // hset name key value
  // - 设置 hashmap 中指定 key 对应的值内容.
  // - Returns 1 is the value is updated, if the value is the same as the old, returns 0.
  hset: {
    returnType: ReturnTypes.int,
  },

  // hget name key
  // - 获取 hashmap 中指定 key 的值内容.
  // - Return the value to the key, if the key does not exists,
  //   return not_found Status Code.
  hget: {
    returnType: ReturnTypes.string
  },

  // hdel name key
  // - 删除 hashmap 中的指定 key(删除整个 hashmap 用 hclear).
  // - If the key exists, return 1, otherwise return 0.
  hdel: {
    returnType: ReturnTypes.int,
  },

  // hincr name key [num]
  // - 使 hashmap 中的 key 对应的值增加 num.
  // - The new value. If the old value cannot be converted to an integer,
  //   returns error Status Code.
  hincr: {
    returnType: ReturnTypes.int,
  },

  // hexists name key
  // - 判断指定的 key 是否存在于 hashmap 中.
  // - If the key exists, return 1, otherwise return 0.
  hexists: {
    returnType: ReturnTypes.bool,
  },

  // hsize name
  // - 返回 hashmap 中的元素个数.
  hsize: {
    returnType: ReturnTypes.int,
  },

  // hlist name_start name_end limit
  // - 列出名字处于区间 (name_start, name_end] 的 hashmap.
  // The key-value list is return as: k1 v1 k2 v2 ...
  hlist: {
    returnType: ReturnTypes.object,
  },

  // hrlist name_start name_end limit
  // - 像 hrlist, 逆序.
  hrlist: {
    returnType: ReturnTypes.object,
  },

  // hkeys name key_start key_end
  // - 列出 hashmap 中处于区间 (key_start, key_end] 的 key 列表.
  // - Key list.
  hkeys: {
    returnType: ReturnTypes.list,
  },

  // hgetall name
  // - 返回整个 hashmap.
  hgetall: {
    returnType: ReturnTypes.object,
  },

  // hscan name key_start key_end limit
  // - 列出 hashmap 中处于区间 (key_start, key_end] 的 key-value 列表.
  hscan: {
    returnType: ReturnTypes.object,
  },

  // hrscan name key_start key_end limit
  // - 像 hscan, 逆序.
  hrscan: {
    returnType: ReturnTypes.object,
  },

  // hclear name
  // - 删除 hashmap 中的所有 key.
  // - The number of key deleted in that hashmap.
  hclear: {
    returnType: ReturnTypes.int,
  },

  // multi_hset name key1 value1 key2 value2 ...
  // - 批量设置 hashmap 中的 key-value.
  // - false on error, other values indicate OK.
  multi_hset: {
    returnType: ReturnTypes.int,
  },

  // multi_hget name key1 key2 ...
  // - 批量获取 hashmap 中多个 key 对应的权重值.
  // - Key-value list.
  multi_hget: {
    returnType: ReturnTypes.object,
  },

  // multi_hdel name key1 key2 ...
  // - 指删除 hashmap 中的 key.
  // - false on error, other values indicate OK.
  multi_hdel: {
    returnType: ReturnTypes.int,
  },

//------------------------------------------------------------------------------
// Z-set
//------------------------------------------------------------------------------
  // zset name key score
  // - 设置 zset 中指定 key 对应的权重值.
  // - false on error, other values indicate OK.
  zset: {
    returnType: ReturnTypes.int,
  },
  // zget name key
  // - 获取 zset 中指定 key 的权重值.
  // - Returns null if key not found, false on error, otherwise, the score related to this key is returned.
  zget: {
    returnType: ReturnTypes.float,
  },
  // zdel name key
  // - 获取 zset 中的指定 key.
  // - false on error, other values indicate OK. You can not determine whether the key exists or not.
  zdel: {
    returnType: ReturnTypes.int,
  },

  // zincr name key num
  // - 使 zset 中的 key 对应的值增加 num. 参数 num 可以为负数.
  //   如果原来的值不是整数(字符串形式的整数), 它会被先转换成整数.
  // - false on error, other values the new value.
  zincr: {
    returnType: ReturnTypes.int,
  },

  // zexists name key
  // - 判断指定的 key 是否存在于 zset 中.
  // - If the key exists, return true, otherwise return false.
  zexists: {
    returnType: ReturnTypes.bool,
  },

  // zsize name
  // - 返回 zset 中的元素个数.
  // - false on error, otherwise an integer, 0 if the zset does not exist.
  zsize: {
    returnType: ReturnTypes.int,
  },

  // zlist
  // - 列出名字处于区间 (name_start, name_end] 的 zset.
  // - false on error, otherwise an array containing the names.
  zlist: {
    returnType: ReturnTypes.list,
  },

  // zrlist
  // - 像 zlist, 逆序.
  zrlist: {
    returnType: ReturnTypes.list,
  },

  // zkeys name key_start score_start score_end limit
  // - 列出 zset 中的 key 列表.
  // - false on error, otherwise an array containing the keys.
  zkeys: {
    returnType: ReturnTypes.list,
  },

  // zscan name key_start score_start score_end limit
  // - 列出 zset 中处于区间 (key_start+score_start, score_end] 的 key-score 列表.
  zscan: {
    returnType: ReturnTypes.object,
  },

  // zrscan name key_start score_start score_end limit
  // - 像 zscan, 逆序.
  zrscan: {
    returnType: ReturnTypes.object,
  },

  // zrank name key
  // - 返回指定 key 在 zset 中的排序位置(排名), 排名从 0 开始.
  // - false on error, otherwise the rank(index) of a specified key, start at 0.
  //   null if not found.
  // TODO null => -1 ?
  zrank: {
    returnType: ReturnTypes.int,
  },

  //  zrrank name key
  //  像 zrank, 逆序.
  zrrank: {
    returnType: ReturnTypes.int,
  },

  // zrange name offset limit
  // - 根据下标索引区间 [offset, offset + limit) 获取 key-score 对, 下标从 0 开始.
  // zrrange name offset limit
  // - 像 zrange, 逆序.

  // zclear name
  // - 删除 zset 中的所有 key.
  // - false on error, or the number of keys deleted.
  zclear: {
    returnType: ReturnTypes.int,
  },

  // zcount name start end
  // - 返回处于区间 [start,end] key 数量.
  // - false on error, or the number of keys in specified range.
  zcount: {
    returnType: ReturnTypes.float,
  },

  // zsum name start end
  // - 返回 key 处于区间 [start,end] 的 score 的和.
  // - false on error, or the sum of keys in specified range.
  zsum: {
    returnType: ReturnTypes.float,
  },

  // zavg name start end
  // - 返回 key 处于区间 [start,end] 的 score 的平均值.
  // - false on error, or the average of keys in specified range.
  zavg: {
    returnType: ReturnTypes.float,
  },

  // zremrangebyrank name start end
  // - 删除位置处于区间 [start,end] 的元素.
  // -false on error, or the number of deleted elements.
  zremrangebyrank: {
    returnType: ReturnTypes.int,
  },

  // zremrangebyscore name start end
  // - 删除权重处于区间 [start,end] 的元素.
  zremrangebyscore: {
    returnType: ReturnTypes.int,
  },

  // zpop_front name limit
  // - 从 zset 首部删除 limit 个元素.
  // - false on error, otherwise an array containing key-score pairs.
  zpop_front: {
    returnType: ReturnTypes.object,
  },

  // zpop_back name limit
  // - 从 zset 尾部删除 limit 个元素.
  // - false on error, otherwise an array containing key-score pairs.
  zpop_back: {
    returnType: ReturnTypes.object,
  },

  // multi_zset name key1 score1 key2 score2 ...
  // - 批量设置 zset 中的 key-score.
  // - false on error, other values indicate OK.
  multi_zset: {
    returnType: ReturnTypes.int,
  },

  // multi_zget name key1 key2 ...
  // - 批量获取 zset 中多个 key 对应的权重值.
  // - false on error, otherwise an associative array containing ONLY found keys and values.
  multi_zget: {
    returnType: ReturnTypes.object,
  },

  // multi_zdel name key1 key2 ...
  // - 批量删除 zset 中的 key.
  // - false on error, other values indicate OK.
  multi_zdel: {
    returnType: ReturnTypes.int,
  },

//------------------------------------------------------------------------------
// List
//------------------------------------------------------------------------------
  // qpush_front name item1 item2 ...
  // - 往队列的首部添加一个或者多个元素.
  // - The length of the list after the push operation, false on error.
  qpush_front: {
    returnType: ReturnTypes.int,
  },

  // qpush_back name item1 item2 ...
  // - 往队列的尾部添加一个或者多个元素.
  // - The length of the list after the push operation, false on error.
  qpush_back: {
    returnType: ReturnTypes.int,
  },

  // qpop_front name size
  // - 从队列首部弹出最后一个或者多个元素.
  // - false on error.
  //   When size is not specified or less than 2,
  //      returns null if queue empty, otherwise the item removed.
  //   When size is specified and greater than or equal to 2,
  //      returns an array of elements removed.
  qpop_front: {
    returnType: ReturnTypes.list,
  },

  // qpop_back name size
  // - 从队列尾部弹出最后一个或者多个元素.
  // - same as qpop_front
  qpop_back: {
    returnType: ReturnTypes.list,
  },

  // qpush name item1 item2 ...
  // - 是 `qpush_back` 的别名..
  qpush: {
    returnType: ReturnTypes.int,
  },

  // qpop name size
  // - 是 `qpop_front` 的别名..
  qpop: {
    returnType: ReturnTypes.int,
  },

  // qfront name
  // - 返回队列的第一个元素.
  // - false on error, null if queue empty, otherwise the item returned.
  qfront: {
    returnType: ReturnTypes.string,
  },

  // qback name
  // - 返回队列的最后一个元素.
  // - false on error, null if queue empty, otherwise the item returned.
  qback: {
    returnType: ReturnTypes.string,
  },

  // qsize name
  // - 返回队列的长度.
  // - false on error, otherwise an integer, 0 if the queue does not exist.
  qsize: {
    returnType: ReturnTypes.int,
  },

  // qclear name
  // 清空一个队列.
  // - false on error
  qclear: {
    returnType: ReturnTypes.void,
  },

  // qget name index
  // - 返回指定位置的元素.
  // - false on error, null if no element corresponds to this index, otherwise the item returned.
  qget: {
    returnType: ReturnTypes.string,
  },

  // qset name index val
  // - 更新位于 index 位置的元素.
  // - false on error, other values indicate OK.
  gset: {
    returnType: ReturnTypes.int,
  },

  // qrange name offset limit
  // - 返回下标处于区域 [offset, offset + limit] 的元素.
  // - false on error, otherwise an array containing items.
  qrange: {
    returnType: ReturnTypes.list,
  },

  // qslice name begin end
  // - 返回下标处于区域 [begin, end] 的元素. begin 和 end 可以是负数
  // - false on error, otherwise an array containing items.
  qslice: {
    returnType: ReturnTypes.list,
  },

  // qtrim_front name size
  // - 从队列头部删除多个元素.
  // - false on error. Return the number of elements removed.
  qtrim: {
    returnType: ReturnTypes.int,
  },

  // qtrim_back name size
  // - 从队列头部删除多个元素.
  // - false on error. Return the number of elements removed.
  qtrim_back: {
    returnType: ReturnTypes.int,
  },

  // qlist name_start name_end limit
  // - 列出名字处于区间 (name_start, name_end] 的 queue/list.
  // - false on error, otherwise an array containing the names.
  qlist: {
    returnType: ReturnTypes.list,
  },

  // qrlist name_start name_end limit
  // - 像 qlist, 逆序.
  qrlist: {
    returnType: ReturnTypes.list,
  },
};

module.exports = {
  Errors,
  ReturnTypes,
  ResponseStatus,
  Commands
};
