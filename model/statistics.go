package model

import (
	"fmt"
	"time"
)

// LogStatistics holds detailed metrics about logs and API usage
type LogStatistics struct {
	// Request counts
	TotalLogs     int    `json:"total_logs"`
	TotalRequests int    `json:"total_requests"`
	SuccessCount  int    `json:"success_count"`
	ErrorCount    int    `json:"error_count"`
	SuccessRate   string `json:"success_rate"`
	ErrorRate     string `json:"error_rate"`

	// Quota and token statistics
	Quota          int `json:"quota"`
	QuotaUsedToday int `json:"quota_used_today"`
	RemainQuota    int `json:"remain_quota"`
	TotalUsedQuota int `json:"total_used_quota"`

	// Rate statistics
	Rpm int `json:"rpm"`
	Tpm int `json:"tpm"`

	// Performance metrics
	ProcessingTime  string `json:"processing_time"`
	ProcessingSpeed string `json:"processing_speed"`

	// Cost calculations
	Cost         float64 `json:"cost"`
	TokensCost   float64 `json:"tokens_cost"`
	TotalTokens  int     `json:"total_tokens"`
	TimePerToken float64 `json:"time_per_token"`
	CostPerToken float64 `json:"cost_per_token"`

	// Request status
	RequestStatus string `json:"request_status"`
}

// CalculateLogStatistics computes detailed statistics from a collection of logs
func CalculateLogStatistics(logs []*Log, userQuota int) LogStatistics {
	stats := LogStatistics{}

	// Initialize counters
	stats.TotalLogs = len(logs)
	totalRequestLogs := 0
	successCount := 0
	errorCount := 0
	totalQuota := 0
	totalTokens := 0
	totalProcessingTime := 0
	quotaUsedToday := 0

	// Calculate today's start timestamp
	todayStart := time.Now().Truncate(24 * time.Hour).Unix()

	// Process each log
	for _, log := range logs {
		if log.Type == LogTypeConsume || log.Type == LogTypeError {
			totalRequestLogs++

			if log.Type == LogTypeConsume {
				successCount++
			} else if log.Type == LogTypeError {
				errorCount++
			}

			totalQuota += log.Quota
			totalTokens += log.PromptTokens + log.CompletionTokens
			totalProcessingTime += log.UseTime

			// Calculate today's quota usage
			if log.CreatedAt >= todayStart {
				quotaUsedToday += log.Quota
			}
		}
	}

	// Calculate rates and averages
	stats.TotalRequests = totalRequestLogs
	stats.SuccessCount = successCount
	stats.ErrorCount = errorCount

	if totalRequestLogs > 0 {
		stats.SuccessRate = fmt.Sprintf("%.2f%%", float64(successCount)/float64(totalRequestLogs)*100)
		stats.ErrorRate = fmt.Sprintf("%.2f%%", float64(errorCount)/float64(totalRequestLogs)*100)
	} else {
		stats.SuccessRate = "0.00%"
		stats.ErrorRate = "0.00%"
	}

	stats.Quota = userQuota
	stats.QuotaUsedToday = quotaUsedToday
	stats.RemainQuota = userQuota
	stats.TotalUsedQuota = totalQuota

	// Calculate processing metrics
	avgProcessingTime := 0.0
	if successCount > 0 {
		avgProcessingTime = float64(totalProcessingTime) / float64(successCount)
		stats.ProcessingTime = fmt.Sprintf("%.2f ms", avgProcessingTime)
		stats.ProcessingSpeed = fmt.Sprintf("%d ms", int(avgProcessingTime))
	} else {
		stats.ProcessingTime = "NaN"
		stats.ProcessingSpeed = "0 ms"
	}

	// Calculate token metrics
	if totalTokens > 0 {
		stats.TimePerToken = avgProcessingTime / float64(totalTokens)
	}

	// Use quota_per_unit to convert quota to cost
	quotaPerUnit := 500000.0 // Default value, should be replaced with the actual value from settings
	stats.Cost = float64(totalQuota) / quotaPerUnit
	stats.TokensCost = stats.Cost * 0.9 // Approximation, adjust as needed
	stats.TotalTokens = totalTokens

	if totalTokens > 0 {
		stats.CostPerToken = stats.Cost / float64(totalTokens)
	}

	// Set request status
	if successCount > errorCount {
		stats.RequestStatus = "success"
	} else if errorCount > 0 {
		stats.RequestStatus = "partial_success"
	} else {
		stats.RequestStatus = "no_data"
	}

	// Add real-time RPM and TPM from the Stat object
	recentStats := SumUsedQuota(LogTypeConsume, time.Now().Add(-60*time.Second).Unix(), 0, "", "", "", 0, "")
	stats.Rpm = recentStats.Rpm
	stats.Tpm = recentStats.Tpm

	return stats
}

// CalculateSingleLogStatistics computes detailed statistics for a single log entry
func CalculateSingleLogStatistics(log *Log, userQuota int) LogStatistics {
	stats := LogStatistics{}

	// Initialize basic counters
	stats.TotalLogs = 1
	stats.TotalRequests = 1

	if log.Type == LogTypeConsume {
		stats.SuccessCount = 1
		stats.ErrorCount = 0
		stats.SuccessRate = "100.00%"
		stats.ErrorRate = "0.00%"
		stats.RequestStatus = "success"
	} else if log.Type == LogTypeError {
		stats.SuccessCount = 0
		stats.ErrorCount = 1
		stats.SuccessRate = "0.00%"
		stats.ErrorRate = "100.00%"
		stats.RequestStatus = "error"
	}

	// Set quota information
	stats.Quota = userQuota
	stats.QuotaUsedToday = log.Quota // Simplified, in reality you'd calculate the actual daily usage
	stats.RemainQuota = userQuota
	stats.TotalUsedQuota = log.Quota

	// Calculate token and processing metrics
	totalTokens := log.PromptTokens + log.CompletionTokens
	stats.TotalTokens = totalTokens

	if log.UseTime > 0 {
		stats.ProcessingTime = fmt.Sprintf("%.2f ms", float64(log.UseTime))
		stats.ProcessingSpeed = fmt.Sprintf("%d ms", log.UseTime)

		if totalTokens > 0 {
			stats.TimePerToken = float64(log.UseTime) / float64(totalTokens)
		}
	} else {
		stats.ProcessingTime = "NaN"
		stats.ProcessingSpeed = "0 ms"
	}

	// Calculate cost metrics
	quotaPerUnit := 500000.0 // Default value, should be replaced with the actual value from settings
	stats.Cost = float64(log.Quota) / quotaPerUnit
	stats.TokensCost = stats.Cost * 0.9 // Approximation, adjust as needed

	if totalTokens > 0 {
		stats.CostPerToken = stats.Cost / float64(totalTokens)
	}

	// Real-time RPM and TPM will be minimal for a single log
	stats.Rpm = 1
	stats.Tpm = totalTokens

	return stats
}

// GetUserQuotaForStats retrieves a user's quota information for statistics calculations
// This replaces the conflicting GetUserById in our code
func GetUserQuotaForStats(userId int) (int, error) {
	var user User
	err := DB.Select("quota").Where("id = ?", userId).First(&user).Error
	if err != nil {
		return 0, err
	}
	return user.Quota, nil
}
