package service

import (
	"one-api/common"
	relaycommon "one-api/relay/common"

	"github.com/gin-gonic/gin"
)

// GenerateTextOtherInfo generates the "other" map for text API logs
func GenerateTextOtherInfo(c *gin.Context, info *relaycommon.RelayInfo, modelRatio, groupRatio, completionRatio float64,
	cacheTokens int, cacheRatio float64, modelPrice float64) map[string]interface{} {

	other := make(map[string]interface{})
	other["model_ratio"] = modelRatio
	other["group_ratio"] = groupRatio
	other["completion_ratio"] = completionRatio
	other["cache_tokens"] = cacheTokens
	other["cache_ratio"] = cacheRatio

	// Add first response time if available
	if info.FirstResponseTime.After(info.StartTime) {
		other["frt"] = float64(info.FirstResponseTime.UnixMilli() - info.StartTime.UnixMilli())
	}

	// Add reasoning effort if present
	if info.ReasoningEffort != "" {
		other["reasoning_effort"] = info.ReasoningEffort
	}

	// Add model mapping info
	if info.IsModelMapped {
		other["is_model_mapped"] = true
		other["upstream_model_name"] = info.UpstreamModelName
	}

	// Add channels used for retries
	useChannel := c.GetStringSlice("use_channel")
	if len(useChannel) > 0 {
		other["use_channel"] = useChannel
	}

	// Get request body if logging is enabled
	if common.LogRequestEnabled && c.GetString("request_body") != "" {
		reqBody := c.GetString("request_body")
		if len(reqBody) > common.MaxLogReqLength {
			reqBody = reqBody[:common.MaxLogReqLength] + "..."
		}
		other["request"] = reqBody
	}

	// Get response body if logging is enabled
	if common.LogResponseEnabled && c.GetString("response_body") != "" {
		respBody := c.GetString("response_body")
		if len(respBody) > common.MaxLogRespLength {
			respBody = respBody[:common.MaxLogRespLength] + "..."
		}
		other["response"] = respBody
	}

	return other
}
