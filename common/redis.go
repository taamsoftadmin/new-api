package common

import (
	"context"
	"github.com/go-redis/redis/v8"
	"os"
	"time"
)

var RDB *redis.Client
var RedisEnabled = true

// InitRedisClient This function is called after init()
func InitRedisClient() (err error) {
	if os.Getenv("REDIS_CONN_STRING") == "" {
		RedisEnabled = false
		SysLog("REDIS_CONN_STRING not set, Redis is not enabled")
		return nil
	}
	if os.Getenv("SYNC_FREQUENCY") == "" {
		SysLog("SYNC_FREQUENCY not set, use default value 60")
		SyncFrequency = 60
	}
	SysLog("Redis is enabled")
	opt, err := redis.ParseURL(os.Getenv("REDIS_CONN_STRING"))
	if err != nil {
		FatalLog("failed to parse Redis connection string: " + err.Error())
	}
	RDB = redis.NewClient(opt)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	_, err = RDB.Ping(ctx).Result()
	if err != nil {
		FatalLog("Redis ping test failed: " + err.Error())
	}
	return err
}

func ParseRedisOption() *redis.Options {
	opt, err := redis.ParseURL(os.Getenv("REDIS_CONN_STRING"))
	if err != nil {
		FatalLog("failed to parse Redis connection string: " + err.Error())
	}
	return opt
}

func RedisSet(key string, value string, expiration time.Duration) error {
	ctx := context.Background()
	return RDB.Set(ctx, key, value, expiration).Err()
}

func RedisGet(key string) (string, error) {
	ctx := context.Background()
	return RDB.Get(ctx, key).Result()
}

func RedisExpire(key string, expiration time.Duration) error {
	ctx := context.Background()
	return RDB.Expire(ctx, key, expiration).Err()
}

func RedisGetEx(key string, expiration time.Duration) (string, error) {
	ctx := context.Background()
	return RDB.GetSet(ctx, key, expiration).Result()
}

func RedisDel(key string) error {
	ctx := context.Background()
	return RDB.Del(ctx, key).Err()
}

func RedisDecrease(key string, value int64) error {

	// 检查键的剩余生存Time
	ttlCmd := RDB.TTL(context.Background(), key)
	ttl, err := ttlCmd.Result()
	if err != nil {
		// Failure则尝试直接减少
		return RDB.DecrBy(context.Background(), key, value).Err()
	}

	// 如果剩余生存Time大于0，则进行减少Operation
	if ttl > 0 {
		ctx := context.Background()
		// 开始一  Redis事务
		txn := RDB.TxPipeline()

		// 减少Balance
		decrCmd := txn.DecrBy(ctx, key, value)
		if err := decrCmd.Err(); err != nil {
			return err // 如果减少Failure，则直接Back错误
		}

		// 重新SettingsExpiration time，使用原来的Expiration time
		txn.Expire(ctx, key, ttl)

		// 执行事务
		_, err = txn.Exec(ctx)
		return err
	} else {
		_ = RedisDel(key)
	}
	return nil
}
