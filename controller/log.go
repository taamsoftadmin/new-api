package controller

import (
	"fmt"
	"math"
	"net/http"
	"one-api/common"
	"one-api/model"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
)

func GetAllLogs(c *gin.Context) {
	// Check if pagination parameters are provided
	pProvided := c.Query("p") != ""
	pageSizeProvided := c.Query("page_size") != ""

	p, _ := strconv.Atoi(c.Query("p"))
	pageSize, _ := strconv.Atoi(c.Query("page_size"))

	if pProvided || pageSizeProvided {
		// Use pagination if parameters are provided
		if p < 1 {
			p = 1
		}
		if pageSize < 0 {
			pageSize = common.ItemsPerPage
		}
	} else {
		// Return all logs if no pagination parameters
		p = 1
		pageSize = 1000000 // Effectively no limit
	}

	logType, _ := strconv.Atoi(c.Query("type"))
	startTimestamp, _ := strconv.ParseInt(c.Query("start_timestamp"), 10, 64)
	endTimestamp, _ := strconv.ParseInt(c.Query("end_timestamp"), 10, 64)
	username := c.Query("username")
	tokenName := c.Query("token_name")
	modelName := c.Query("model_name")
	channel, _ := strconv.Atoi(c.Query("channel"))
	group := c.Query("group")

	// Get detailed logs with all available information
	logs, total, err := model.GetAllLogs(logType, startTimestamp, endTimestamp, modelName, username, tokenName, (p-1)*pageSize, pageSize, channel, group)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}

	// Enrich logs with additional details if needed
	enrichLogsWithDetails(logs)

	// Calculate statistics for the logs
	// For admin, we don't have a specific user quota, so using a default value
	stats := model.CalculateLogStatistics(logs, 0)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data": map[string]any{
			"items":      logs,
			"total":      total,
			"page":       p,
			"page_size":  pageSize,
			"statistics": stats,
		},
	})
}

func GetUserLogs(c *gin.Context) {
	// Check if pagination parameters are provided
	pProvided := c.Query("p") != ""
	pageSizeProvided := c.Query("page_size") != ""

	p, _ := strconv.Atoi(c.Query("p"))
	pageSize, _ := strconv.Atoi(c.Query("page_size"))

	if pProvided || pageSizeProvided {
		// Use pagination if parameters are provided
		if p < 1 {
			p = 1
		}
		if pageSize < 0 {
			pageSize = common.ItemsPerPage
		}
		if pageSize > 100 {
			pageSize = 100
		}
	} else {
		// Return all logs if no pagination parameters
		p = 1
		pageSize = 1000000 // Effectively no limit
	}

	userId := c.GetInt("id")
	logType, _ := strconv.Atoi(c.Query("type"))
	startTimestamp, _ := strconv.ParseInt(c.Query("start_timestamp"), 10, 64)
	endTimestamp, _ := strconv.ParseInt(c.Query("end_timestamp"), 10, 64)
	tokenName := c.Query("token_name")
	modelName := c.Query("model_name")
	group := c.Query("group")

	// Get detailed logs with all available information
	logs, total, err := model.GetUserLogs(userId, logType, startTimestamp, endTimestamp, modelName, tokenName, (p-1)*pageSize, pageSize, group)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}

	// Enrich user logs with additional details if needed
	enrichLogsWithDetails(logs)

	// Get user's current quota for statistics using our new function
	userQuota, err := model.GetUserQuotaForStats(userId)
	if err != nil {
		userQuota = 0 // Default to 0 if we can't get the quota
	}

	// Calculate statistics for the logs
	stats := model.CalculateLogStatistics(logs, userQuota)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data": map[string]any{
			"items":      logs,
			"total":      total,
			"page":       p,
			"page_size":  pageSize,
			"statistics": stats,
		},
	})
	return
}

func SearchAllLogs(c *gin.Context) {
	keyword := c.Query("keyword")
	logs, err := model.SearchAllLogs(keyword)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    logs,
	})
	return
}

func SearchUserLogs(c *gin.Context) {
	keyword := c.Query("keyword")
	userId := c.GetInt("id")
	logs, err := model.SearchUserLogs(userId, keyword)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    logs,
	})
	return
}

func GetLogByKey(c *gin.Context) {
	key := c.Query("key")
	logs, err := model.GetLogByKey(key)
	if err != nil {
		c.JSON(200, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}

	// Enrich logs with additional details if needed
	enrichLogsWithDetails(logs)

	// For API key access, we don't have a user context, so using a default value
	stats := model.CalculateLogStatistics(logs, 0)

	c.JSON(200, gin.H{
		"success": true,
		"message": "",
		"data": map[string]any{
			"logs":       logs,
			"statistics": stats,
		},
	})
}

// GetLogById retrieves a single log entry by its ID
func GetLogById(c *gin.Context) {
	idStr := c.Query("id")
	if idStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Log ID is required",
		})
		return
	}

	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Invalid log ID",
		})
		return
	}

	isAdmin := c.GetBool("admin")
	userId := c.GetInt("id")

	var log *model.Log

	if isAdmin {
		log, err = model.GetLogById(id)
	} else {
		// For regular users, supporting both real and obfuscated IDs
		log, err = model.GetUserLogById(userId, id)
	}

	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "Log not found or access denied",
		})
		return
	}

	// Add ID information to help with troubleshooting
	idInfo := map[string]interface{}{
		"displayed_id":  id,
		"actual_id":     log.Id,
		"obfuscated_id": log.Id % 1024,
	}

	// Enrich the log with additional details
	logs := []*model.Log{log}
	enrichLogsWithDetails(logs)

	// Get user's current quota for statistics
	userQuota, err := model.GetUserQuotaForStats(userId)
	if err != nil {
		userQuota = 0
	}

	// Calculate detailed statistics for this single log
	stats := model.CalculateSingleLogStatistics(log, userQuota)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data": map[string]any{
			"log":        log,
			"statistics": stats,
			"id_info":    idInfo,
		},
	})
}

func GetLogsStat(c *gin.Context) {
	logType, _ := strconv.Atoi(c.Query("type"))
	startTimestamp, _ := strconv.ParseInt(c.Query("start_timestamp"), 10, 64)
	endTimestamp, _ := strconv.ParseInt(c.Query("end_timestamp"), 10, 64)
	tokenName := c.Query("token_name")
	username := c.Query("username")
	modelName := c.Query("model_name")
	channel, _ := strconv.Atoi(c.Query("channel"))
	group := c.Query("group")
	stat := model.SumUsedQuota(logType, startTimestamp, endTimestamp, modelName, username, tokenName, channel, group)
	//tokenNum := model.SumUsedToken(logType, startTimestamp, endTimestamp, modelName, username, "")
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data": gin.H{
			"quota": stat.Quota,
			"rpm":   stat.Rpm,
			"tpm":   stat.Tpm,
		},
	})
	return
}

func GetLogsSelfStat(c *gin.Context) {
	username := c.GetString("username")
	logType, _ := strconv.Atoi(c.Query("type"))
	startTimestamp, _ := strconv.ParseInt(c.Query("start_timestamp"), 10, 64)
	endTimestamp, _ := strconv.ParseInt(c.Query("end_timestamp"), 10, 64)
	tokenName := c.Query("token_name")
	modelName := c.Query("model_name")
	channel, _ := strconv.Atoi(c.Query("channel"))
	group := c.Query("group")
	quotaNum := model.SumUsedQuota(logType, startTimestamp, endTimestamp, modelName, username, tokenName, channel, group)
	//tokenNum := model.SumUsedToken(logType, startTimestamp, endTimestamp, modelName, username, tokenName)
	c.JSON(200, gin.H{
		"success": true,
		"message": "",
		"data": gin.H{
			"quota": quotaNum.Quota,
			"rpm":   quotaNum.Rpm,
			"tpm":   quotaNum.Tpm,
			//"token": tokenNum,
		},
	})
	return
}

func DeleteHistoryLogs(c *gin.Context) {
	targetTimestamp, _ := strconv.ParseInt(c.Query("target_timestamp"), 10, 64)
	if targetTimestamp == 0 {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "target timestamp is required",
		})
		return
	}
	count, err := model.DeleteOldLog(c.Request.Context(), targetTimestamp, 100)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    count,
	})
	return
}

// Helper function to enrich logs with additional details
func enrichLogsWithDetails(logs []*model.Log) {
	for i := range logs {
		otherMap := common.StrToMap(logs[i].Other)
		if otherMap == nil {
			otherMap = make(map[string]interface{})
		}

		// Add log status information
		otherMap["status"] = getLogStatusInfo(logs[i])

		// Create a dedicated timing metrics section
		timeMetrics := make(map[string]interface{})

		// Add formatted creation time
		createdTime := time.Unix(logs[i].CreatedAt, 0)
		timeMetrics["created_at_timestamp"] = logs[i].CreatedAt
		timeMetrics["created_at_formatted"] = createdTime.Format("2006-01-02 15:04:05")

		// Process request timing info
		if logs[i].UseTime > 0 {
			// Store original value
			timeMetrics["total_processing_ms"] = logs[i].UseTime

			// Add human-readable format for processing time
			processingTimeSeconds := float64(logs[i].UseTime) / 1000.0
			timeMetrics["total_processing_seconds"] = math.Round(processingTimeSeconds*1000) / 1000

			// Format the time for display
			if logs[i].UseTime >= 1000 {
				timeMetrics["processing_time_formatted"] = fmt.Sprintf("%.2f s", processingTimeSeconds)
			} else {
				timeMetrics["processing_time_formatted"] = fmt.Sprintf("%d ms", logs[i].UseTime)
			}

			// Calculate speed metrics for consumption logs
			if logs[i].Type == model.LogTypeConsume {
				totalTokens := logs[i].PromptTokens + logs[i].CompletionTokens
				if totalTokens > 0 {
					// Calculate tokens per second
					tokensPerSecond := float64(totalTokens) / processingTimeSeconds
					timeMetrics["total_tokens_per_second"] = math.Round(tokensPerSecond*100) / 100

					// Add prompt and completion tokens per second if applicable
					if logs[i].PromptTokens > 0 {
						promptTokensPerSecond := float64(logs[i].PromptTokens) / processingTimeSeconds
						timeMetrics["prompt_tokens_per_second"] = math.Round(promptTokensPerSecond*100) / 100
					}

					if logs[i].CompletionTokens > 0 {
						completionTokensPerSecond := float64(logs[i].CompletionTokens) / processingTimeSeconds
						timeMetrics["completion_tokens_per_second"] = math.Round(completionTokensPerSecond*100) / 100
					}
				}
			}
		}

		// Check if first response time (frt) is available
		if frt, ok := otherMap["frt"].(float64); ok && frt > 0 {
			timeMetrics["first_token_time_ms"] = frt

			// Format first token time for display
			if frt >= 1000 {
				timeMetrics["first_token_time_formatted"] = fmt.Sprintf("%.2f s", frt/1000.0)
			} else {
				timeMetrics["first_token_time_formatted"] = fmt.Sprintf("%.1f ms", frt)
			}

			// Calculate time to first token as percentage of total time
			if logs[i].UseTime > 0 {
				frtPercentage := (frt / float64(logs[i].UseTime)) * 100
				timeMetrics["first_token_time_percentage"] = math.Round(frtPercentage*10) / 10
			}
		}

		// Add streaming latency information if available
		if streamLatency, ok := otherMap["stream_latency"].(float64); ok && streamLatency > 0 {
			timeMetrics["stream_latency_ms"] = streamLatency
			if streamLatency >= 1000 {
				timeMetrics["stream_latency_formatted"] = fmt.Sprintf("%.2f s", streamLatency/1000.0)
			} else {
				timeMetrics["stream_latency_formatted"] = fmt.Sprintf("%.1f ms", streamLatency)
			}
		}

		// Store the timing metrics in other
		otherMap["timing_metrics"] = timeMetrics

		// Add request details if available
		if logs[i].Type == model.LogTypeConsume {
			totalTokens := logs[i].PromptTokens + logs[i].CompletionTokens
			otherMap["request_details"] = map[string]interface{}{
				"prompt_tokens":       logs[i].PromptTokens,
				"completion_tokens":   logs[i].CompletionTokens,
				"total_tokens":        totalTokens,
				"is_stream":           logs[i].IsStream,
				"use_time_ms":         logs[i].UseTime,
				"cost":                logs[i].Quota,
				"performance_summary": fmt.Sprintf("Processed %d tokens in %d ms (%.1f tokens/sec)", totalTokens, logs[i].UseTime, timeMetrics["total_tokens_per_second"]),
			}
		}

		// Add more detailed information about the channel if available
		if logs[i].ChannelId > 0 {
			otherMap["channel_info"] = map[string]interface{}{
				"id":   logs[i].ChannelId,
				"name": logs[i].ChannelName,
			}
		}

		// Update the Other field with enriched information
		logs[i].Other = common.MapToJsonStr(otherMap)
	}
}

// Helper function to determine log status information
func getLogStatusInfo(log *model.Log) map[string]interface{} {
	status := make(map[string]interface{})

	// Determine status based on log type
	switch log.Type {
	case model.LogTypeConsume:
		status["code"] = "success"
		status["description"] = "success"
	case model.LogTypeError:
		status["code"] = "error"
		status["description"] = "Failed API request"
		status["error_message"] = log.Content
	case model.LogTypeTopup:
		status["code"] = "topup"
		status["description"] = "Account balance increased"
	case model.LogTypeManage:
		status["code"] = "manage"
		status["description"] = "Administrative action"
	case model.LogTypeSystem:
		status["code"] = "system"
		status["description"] = "System operation"
	default:
		status["code"] = "unknown"
		status["description"] = "Unknown log type"
	}

	return status
}
