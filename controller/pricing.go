package controller

import (
	"one-api/model"
	"one-api/setting"
	"one-api/setting/operation_setting"

	"github.com/gin-gonic/gin"
)

func GetPricing(c *gin.Context) {
	pricing := model.GetPricing()
	userId, exists := c.Get("id")
	usableGroup := map[string]string{}
	groupRatio := map[string]float64{}
	for s, f := range setting.GetGroupRatioCopy() {
		groupRatio[s] = f
	}
	var group string
	if exists {
		user, err := model.GetUserCache(userId.(int))
		if err == nil {
			group = user.Group
			for g := range groupRatio {
				ratio, ok := setting.GetGroupGroupRatio(group, g)
				if ok {
					groupRatio[g] = ratio
				}
			}
		}
	}

	usableGroup = setting.GetUserUsableGroups(group)
	// Filter groupRatio to only include usable groups
	for group := range setting.GetGroupRatioCopy() {
		if _, ok := usableGroup[group]; !ok {
			delete(groupRatio, group)
		}
	}

	// Prepare additional system information
	modelSettings := map[string]interface{}{
		"display_currency": true,
		"quota_per_unit":   500, // $1 = 500 quota
		"usd_to_rmb":       7.3, // 1 USD = 7.3 RMB
	}

	// Convert pricing data to map format and enhance it
	pricingMaps := convertPricingToMaps(pricing)
	enhancedPricing := enhancePricingData(pricingMaps)

	c.JSON(200, gin.H{
		"success":        true,
		"data":           enhancedPricing,
		"group_ratio":    groupRatio,
		"usable_group":   usableGroup,
		"model_settings": modelSettings,
	})
}

// Convert Pricing structs to maps for easier processing
func convertPricingToMaps(pricing []model.Pricing) []map[string]interface{} {
	result := make([]map[string]interface{}, len(pricing))
	for i, p := range pricing {
		// Create a map with all the fields from the Pricing struct
		result[i] = map[string]interface{}{
			"model_name":           p.ModelName,
			"quota_type":           p.QuotaType,
			"model_ratio":          p.ModelRatio,
			"model_price":          p.ModelPrice,
			"owner_by":             p.OwnerBy,
			"completion_ratio":     p.CompletionRatio,
			"image_ratio":          p.ImageRatio,
			"cache_ratio":          p.CacheRatio,
			"cache_creation_ratio": p.CacheCreationRatio,
			"supported_channels":   p.SupportedChannels,
			"enable_groups":        p.EnableGroups,
			"price_per_prompt":     p.PricePerPrompt,
			"price_per_completion": p.PricePerCompletion,
			"model_type":           p.ModelType,
			"token_unit":           1000000, // Default to 1M tokens
		}
	}
	return result
}

// enhancePricingData adds additional details to pricing data for consistency
func enhancePricingData(pricing []map[string]interface{}) []map[string]interface{} {
	for i := range pricing {
		// No need to use modelName since we already have the pricing map

		// Ensure all pricing entries have quota_type field
		if _, exists := pricing[i]["quota_type"]; !exists {
			// Default to token-based (0) unless it's a fixed price model
			fixedPrice := false
			if modelPrice, ok := pricing[i]["model_price"].(float64); ok && modelPrice > 0 {
				fixedPrice = true
			}

			if fixedPrice {
				pricing[i]["quota_type"] = 1
			} else {
				pricing[i]["quota_type"] = 0
			}
		}

		// Calculate price_per_prompt and price_per_completion if not present
		if _, exists := pricing[i]["price_per_prompt"]; !exists {
			modelRatio, ok1 := pricing[i]["model_ratio"].(float64)
			if ok1 {
				// Calculate prices per 1M tokens
				pricePerPrompt := modelRatio * 2.0 // $0.002 per 1K tokens = $2.0 per 1M tokens
				pricing[i]["price_per_prompt"] = pricePerPrompt

				// Also calculate completion price
				completionRatio, ok2 := pricing[i]["completion_ratio"].(float64)
				if ok2 {
					pricing[i]["price_per_completion"] = pricePerPrompt * completionRatio
				} else {
					pricing[i]["price_per_completion"] = pricePerPrompt
				}
			}
		}
	}
	return pricing
}

func ResetModelRatio(c *gin.Context) {
	defaultStr := operation_setting.DefaultModelRatio2JSONString()
	err := model.UpdateOption("ModelRatio", defaultStr)
	if err != nil {
		c.JSON(200, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}
	err = operation_setting.UpdateModelRatioByJSONString(defaultStr)
	if err != nil {
		c.JSON(200, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}
	c.JSON(200, gin.H{
		"success": true,
		"message": "Reset model ratio successfully",
	})
}
