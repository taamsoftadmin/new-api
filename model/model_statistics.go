package model

import (
	"time"
)

// ModelStatistics represents usage statistics for a specific model
type ModelStatistics struct {
	ModelName      string  `json:"model_name"`
	TotalRequests  int     `json:"total_requests"`
	TotalTokens    int     `json:"total_tokens"`
	AverageLatency float64 `json:"average_latency"`
	SuccessRate    float64 `json:"success_rate"`
	LastUsed       int64   `json:"last_used"`
}

// GetModelStatistics retrieves usage statistics for a specific model
func GetModelStatistics(modelName string) (*ModelStatistics, error) {
	stats := &ModelStatistics{
		ModelName: modelName,
	}

	// Get total requests
	var totalRequests int64
	err := DB.Model(&Log{}).Where("model_name = ? AND type = ?", modelName, LogTypeConsume).Count(&totalRequests).Error
	if err != nil {
		return nil, err
	}
	stats.TotalRequests = int(totalRequests)

	// Get success rate
	var totalErrorRequests int64
	err = DB.Model(&Log{}).Where("model_name = ? AND type = ?", modelName, LogTypeError).Count(&totalErrorRequests).Error
	if err != nil {
		return nil, err
	}

	if totalRequests+totalErrorRequests > 0 {
		stats.SuccessRate = float64(totalRequests) / float64(totalRequests+totalErrorRequests) * 100
	} else {
		stats.SuccessRate = 100 // Default if no requests
	}

	// Get token usage
	var totalPromptTokens, totalCompletionTokens int
	err = DB.Model(&Log{}).Select("SUM(prompt_tokens) as total_prompt, SUM(completion_tokens) as total_completion").
		Where("model_name = ? AND type = ?", modelName, LogTypeConsume).
		Row().Scan(&totalPromptTokens, &totalCompletionTokens)
	if err != nil {
		// Just continue, this is not critical
		totalPromptTokens = 0
		totalCompletionTokens = 0
	}
	stats.TotalTokens = totalPromptTokens + totalCompletionTokens

	// Get average latency from the last 100 requests
	var avgLatency float64
	err = DB.Model(&Log{}).Select("AVG(use_time)").
		Where("model_name = ? AND type = ? AND use_time > 0", modelName, LogTypeConsume).
		Limit(100).Order("id DESC").Row().Scan(&avgLatency)
	if err != nil {
		// Just continue, this is not critical
		avgLatency = 0
	}
	stats.AverageLatency = avgLatency

	// Get last used timestamp
	var lastUsed int64
	err = DB.Model(&Log{}).Select("MAX(created_at)").
		Where("model_name = ? AND type = ?", modelName, LogTypeConsume).
		Row().Scan(&lastUsed)
	if err != nil || lastUsed == 0 {
		// Set to current time if no data or error
		lastUsed = time.Now().Unix()
	}
	stats.LastUsed = lastUsed

	return stats, nil
}

// GetPopularModels returns a list of the most frequently used models
func GetPopularModels(limit int) ([]ModelStatistics, error) {
	if limit <= 0 {
		limit = 10
	}

	// Query to get top used models with counts
	rows, err := DB.Raw(`
		SELECT 
			model_name, 
			COUNT(*) as request_count,
			SUM(prompt_tokens + completion_tokens) as total_tokens
		FROM 
			logs 
		WHERE 
			type = ? 
		GROUP BY 
			model_name 
		ORDER BY 
			request_count DESC 
		LIMIT ?`,
		LogTypeConsume, limit).Rows()

	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []ModelStatistics
	for rows.Next() {
		var modelName string
		var requestCount int
		var totalTokens int

		if err := rows.Scan(&modelName, &requestCount, &totalTokens); err != nil {
			continue
		}

		// For each model, get additional statistics
		stats, err := GetModelStatistics(modelName)
		if err != nil {
			// Use the basic data we have
			stats = &ModelStatistics{
				ModelName:     modelName,
				TotalRequests: requestCount,
				TotalTokens:   totalTokens,
				SuccessRate:   100,
				LastUsed:      time.Now().Unix(),
			}
		}

		result = append(result, *stats)
	}

	return result, nil
}
