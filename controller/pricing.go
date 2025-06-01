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

	c.JSON(200, gin.H{
		"success":        true,
		"data":           pricing,
		"group_ratio":    groupRatio,
		"usable_group":   usableGroup,
		"model_settings": modelSettings,
	})
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
