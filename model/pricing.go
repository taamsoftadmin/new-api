package model

import (
	"one-api/common"
	"one-api/setting/ratio_setting"
	"strings"
	"sync"
	"time"
)

// Pricing represents the pricing information for a model
type Pricing struct {
	ModelName          string                   `json:"model_name"`
	QuotaType          int                      `json:"quota_type"`           // 0 = token-based, 1 = fixed price
	ModelRatio         float64                  `json:"model_ratio"`          // Base ratio for model pricing
	ModelPrice         float64                  `json:"model_price"`          // Fixed price per request (if applicable)
	OwnerBy            string                   `json:"owner_by"`             // Model owner
	CompletionRatio    float64                  `json:"completion_ratio"`     // Ratio for completion vs prompt
	EnableGroups       []string                 `json:"enable_groups"`        // Enabled user groups
	ImageRatio         float64                  `json:"image_ratio"`          // Image ratio if applicable
	CacheRatio         float64                  `json:"cache_ratio"`          // Token cache ratio
	CacheCreationRatio float64                  `json:"cache_creation_ratio"` // Token cache creation ratio
	SupportedChannels  []map[string]interface{} `json:"supported_channels"`   // Supported channel types
	PricePerPrompt     float64                  `json:"price_per_prompt"`     // Price per 1M prompt tokens
	PricePerCompletion float64                  `json:"price_per_completion"` // Price per 1M completion tokens
	ModelType          string                   `json:"model_type"`           // llm, embedding, etc.
}

var (
	pricingMap         []Pricing
	lastGetPricingTime time.Time
	updatePricingLock  sync.Mutex
)

func GetPricing() []Pricing {
	updatePricingLock.Lock()
	defer updatePricingLock.Unlock()

	if time.Since(lastGetPricingTime) > time.Minute*1 || len(pricingMap) == 0 {
		updatePricing()
	}
	return pricingMap
}

func updatePricing() {
	enableAbilities := GetAllEnableAbilities()
	modelGroupsMap := make(map[string][]string)
	modelChannelMap := make(map[string]map[int]bool)

	// Build maps for models with their groups and channels
	for _, ability := range enableAbilities {
		// Build group map
		groups := modelGroupsMap[ability.Model]
		if groups == nil {
			groups = make([]string, 0)
		}
		if !common.StringsContains(groups, ability.Group) {
			groups = append(groups, ability.Group)
		}
		modelGroupsMap[ability.Model] = groups

		// Build channel type map
		if modelChannelMap[ability.Model] == nil {
			modelChannelMap[ability.Model] = make(map[int]bool)
		}
		modelChannelMap[ability.Model][ability.ChannelId] = true
	}

	pricingMap = make([]Pricing, 0)
	for model, groups := range modelGroupsMap {
		pricing := Pricing{
			ModelName:    model,
			EnableGroups: groups,
			ModelType:    DetermineModelType(model), // Set the model type
		}
		modelPrice, findPrice := ratio_setting.GetModelPrice(model, false)
		if findPrice {
			pricing.ModelPrice = modelPrice
			pricing.QuotaType = 1
		} else {
			modelRatio, _ := ratio_setting.GetModelRatio(model)
			pricing.ModelRatio = modelRatio
			pricing.CompletionRatio = ratio_setting.GetCompletionRatio(model)
			pricing.QuotaType = 0

			// Calculate price per 1M tokens based on model ratio (1 ratio = $0.002 / 1K tokens = $2 / 1M tokens)
			pricing.PricePerPrompt = pricing.ModelRatio * 2.0
			pricing.PricePerCompletion = pricing.PricePerPrompt * pricing.CompletionRatio
		}

		// Get additional model-related ratios
		pricing.CacheRatio, _ = ratio_setting.GetCacheRatio(model)
		pricing.CacheCreationRatio, _ = ratio_setting.GetCreateCacheRatio(model)
		pricing.ImageRatio, _ = ratio_setting.GetImageRatio(model)

		// Get channel types that support this model
		channels := modelChannelMap[model]
		if channels != nil && len(channels) > 0 {
			supportedChannels := make([]map[string]interface{}, 0)
			for channelType := range channels {
				channelName := GetChannelTypeName(channelType)
				if channelName != "" {
					supportedChannels = append(supportedChannels, map[string]interface{}{
						"id":   channelType,
						"name": channelName,
					})
				}
			}
			pricing.SupportedChannels = supportedChannels

			// If we have channel information, set owner based on first channel
			if len(supportedChannels) > 0 {
				pricing.OwnerBy = supportedChannels[0]["name"].(string)
			}
		}

		pricingMap = append(pricingMap, pricing)
	}
	lastGetPricingTime = time.Now()
}

// DetermineModelType determines the model type based on model name patterns
func DetermineModelType(modelName string) string {
	lowerModelName := strings.ToLower(modelName)

	// Embedding models
	if strings.Contains(lowerModelName, "embedding") ||
		strings.Contains(lowerModelName, "embed") ||
		strings.HasPrefix(lowerModelName, "m3e") ||
		strings.Contains(lowerModelName, "bge-") {
		return "embedding"
	}

	// Reranking models
	if strings.Contains(lowerModelName, "rerank") {
		return "reranking"
	}

	// Voice/Audio models
	if strings.Contains(lowerModelName, "tts") ||
		strings.Contains(lowerModelName, "whisper") ||
		strings.Contains(lowerModelName, "audio") {
		return "voice"
	}

	// Image models
	if strings.Contains(lowerModelName, "dall-e") ||
		strings.Contains(lowerModelName, "mj_") ||
		strings.Contains(lowerModelName, "imagen") ||
		strings.Contains(lowerModelName, "image") {
		return "image"
	}

	// Suno music generation
	if strings.Contains(lowerModelName, "suno") {
		return "music"
	}

	// Moderation models
	if strings.Contains(lowerModelName, "moderation") {
		return "moderation"
	}

	// Most models that don't match above patterns are LLMs
	return "llm"
}

// GetChannelTypeName returns the name of a channel type based on its ID
func GetChannelTypeName(channelType int) string {
	// Map channel type IDs to their names
	channelTypes := map[int]string{
		1:  "OpenAI",
		2:  "Azure",
		3:  "Claude",
		4:  "PaLM",
		5:  "Gemini",
		6:  "Baidu",
		7:  "Zhipu",
		8:  "Xunfei",
		9:  "Midjourney",
		10: "DALL-E",
		11: "Ali",
		12: "Baichuan",
		13: "AWS Bedrock",
		14: "Moonshot",
		15: "MinimaxAI",
		16: "DeepSeek",
		17: "Gemma",
		18: "Tencent",
		19: "Ollama",
		20: "Mistral",
		21: "Qwen",
		22: "OpenRouter",
		23: "Douyin",
		24: "Google",
		25: "360",
		26: "Suno",
		27: "Yi",
		28: "Anthropic",
		29: "PerplexityAI",
		30: "Together AI",
		31: "Lingyiwanwu",
		32: "Groq",
		33: "Cohere",
		// Add more as needed
	}

	if name, exists := channelTypes[channelType]; exists {
		return name
	}
	return ""
}
