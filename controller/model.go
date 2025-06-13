package controller

import (
	"fmt"
	"net/http"
	"one-api/common"
	"one-api/constant"
	"one-api/dto"
	"one-api/model"
	"one-api/relay"
	"one-api/relay/channel/ai360"
	"one-api/relay/channel/lingyiwanwu"
	"one-api/relay/channel/minimax"
	"one-api/relay/channel/moonshot"
	relaycommon "one-api/relay/common"
	relayconstant "one-api/relay/constant"
	"one-api/setting/operation_setting"
	"sort"
	"strings"

	"github.com/gin-gonic/gin"
)

// https://platform.openai.com/docs/api-reference/models/list

var openAIModels []dto.OpenAIModels
var openAIModelsMap map[string]dto.OpenAIModels
var channelId2Models map[int][]string

func getPermission() []dto.OpenAIModelPermission {
	var permission []dto.OpenAIModelPermission
	permission = append(permission, dto.OpenAIModelPermission{
		Id:                 "modelperm-LwHkVFn8AcMItP432fKKDIKJ",
		Object:             "model_permission",
		Created:            1626777600,
		AllowCreateEngine:  true,
		AllowSampling:      true,
		AllowLogprobs:      true,
		AllowSearchIndices: false,
		AllowView:          true,
		AllowFineTuning:    false,
		Organization:       "*",
		Group:              nil,
		IsBlocking:         false,
	})
	return permission
}

func init() {
	// https://platform.openai.com/docs/models/model-endpoint-compatibility
	permission := getPermission()
	for i := 0; i < relayconstant.APITypeDummy; i++ {
		if i == relayconstant.APITypeAIProxyLibrary {
			continue
		}
		adaptor := relay.GetAdaptor(i)
		channelName := adaptor.GetChannelName()
		modelNames := adaptor.GetModelList()
		for _, modelName := range modelNames {
			openAIModels = append(openAIModels, dto.OpenAIModels{
				Id:         modelName,
				Object:     "model",
				Created:    1626777600,
				OwnedBy:    channelName,
				Permission: permission,
				Root:       modelName,
				Parent:     nil,
			})
		}
	}
	for _, modelName := range ai360.ModelList {
		openAIModels = append(openAIModels, dto.OpenAIModels{
			Id:         modelName,
			Object:     "model",
			Created:    1626777600,
			OwnedBy:    ai360.ChannelName,
			Permission: permission,
			Root:       modelName,
			Parent:     nil,
		})
	}
	for _, modelName := range moonshot.ModelList {
		openAIModels = append(openAIModels, dto.OpenAIModels{
			Id:         modelName,
			Object:     "model",
			Created:    1626777600,
			OwnedBy:    moonshot.ChannelName,
			Permission: permission,
			Root:       modelName,
			Parent:     nil,
		})
	}
	for _, modelName := range lingyiwanwu.ModelList {
		openAIModels = append(openAIModels, dto.OpenAIModels{
			Id:         modelName,
			Object:     "model",
			Created:    1626777600,
			OwnedBy:    lingyiwanwu.ChannelName,
			Permission: permission,
			Root:       modelName,
			Parent:     nil,
		})
	}
	for _, modelName := range minimax.ModelList {
		openAIModels = append(openAIModels, dto.OpenAIModels{
			Id:         modelName,
			Object:     "model",
			Created:    1626777600,
			OwnedBy:    minimax.ChannelName,
			Permission: permission,
			Root:       modelName,
			Parent:     nil,
		})
	}
	for modelName, _ := range constant.MidjourneyModel2Action {
		openAIModels = append(openAIModels, dto.OpenAIModels{
			Id:         modelName,
			Object:     "model",
			Created:    1626777600,
			OwnedBy:    "midjourney",
			Permission: permission,
			Root:       modelName,
			Parent:     nil,
		})
	}
	openAIModelsMap = make(map[string]dto.OpenAIModels)
	for _, aiModel := range openAIModels {
		openAIModelsMap[aiModel.Id] = aiModel
	}
	channelId2Models = make(map[int][]string)
	for i := 1; i <= common.ChannelTypeDummy; i++ {
		apiType, success := relayconstant.ChannelType2APIType(i)
		if !success || apiType == relayconstant.APITypeAIProxyLibrary {
			continue
		}
		meta := &relaycommon.RelayInfo{ChannelType: i}
		adaptor := relay.GetAdaptor(apiType)
		adaptor.Init(meta)
		channelId2Models[i] = adaptor.GetModelList()
	}
}

func ListModels(c *gin.Context) {
	userOpenAiModels := make([]dto.OpenAIModels, 0)
	permission := getPermission()

	modelLimitEnable := c.GetBool("token_model_limit_enabled")
	if modelLimitEnable {
		s, ok := c.Get("token_model_limit")
		var tokenModelLimit map[string]bool
		if ok {
			tokenModelLimit = s.(map[string]bool)
		} else {
			tokenModelLimit = map[string]bool{}
		}
		for allowModel, _ := range tokenModelLimit {
			if _, ok := openAIModelsMap[allowModel]; ok {
				userOpenAiModels = append(userOpenAiModels, openAIModelsMap[allowModel])
			} else {
				userOpenAiModels = append(userOpenAiModels, dto.OpenAIModels{
					Id:         allowModel,
					Object:     "model",
					Created:    1626777600,
					OwnedBy:    "custom",
					Permission: permission,
					Root:       allowModel,
					Parent:     nil,
				})
			}
		}
	} else {
		userId := c.GetInt("id")
		userGroup, err := model.GetUserGroup(userId, true)
		if err != nil {
			c.JSON(http.StatusOK, gin.H{
				"success": false,
				"message": "get user group failed",
			})
			return
		}
		group := userGroup
		tokenGroup := c.GetString("token_group")
		if tokenGroup != "" {
			group = tokenGroup
		}
		models := model.GetGroupModels(group)
		for _, s := range models {
			if _, ok := openAIModelsMap[s]; ok {
				userOpenAiModels = append(userOpenAiModels, openAIModelsMap[s])
			} else {
				userOpenAiModels = append(userOpenAiModels, dto.OpenAIModels{
					Id:         s,
					Object:     "model",
					Created:    1626777600,
					OwnedBy:    "custom",
					Permission: permission,
					Root:       s,
					Parent:     nil,
				})
			}
		}
	}
	c.JSON(200, gin.H{
		"success": true,
		"data":    userOpenAiModels,
	})
}

func ChannelListModels(c *gin.Context) {
	c.JSON(200, gin.H{
		"success": true,
		"data":    openAIModels,
	})
}

func DashboardListModels(c *gin.Context) {
	c.JSON(200, gin.H{
		"success": true,
		"data":    channelId2Models,
	})
}

func EnabledListModels(c *gin.Context) {
	c.JSON(200, gin.H{
		"success": true,
		"data":    model.GetEnabledModels(),
	})
}

func RetrieveModel(c *gin.Context) {
	modelId := c.Param("model")
	if aiModel, ok := openAIModelsMap[modelId]; ok {
		c.JSON(200, aiModel)
	} else {
		openAIError := dto.OpenAIError{
			Message: fmt.Sprintf("The model '%s' does not exist", modelId),
			Type:    "invalid_request_error",
			Param:   "model",
			Code:    "model_not_found",
		}
		c.JSON(200, gin.H{
			"error": openAIError,
		})
	}
}

// EnhancedListModels returns detailed information about models
func EnhancedListModels(c *gin.Context) {
	userOpenAiModels := make([]dto.EnhancedModel, 0)

	// Determine which models to include based on user permissions
	modelLimitEnable := c.GetBool("token_model_limit_enabled")
	var modelSet map[string]bool

	if modelLimitEnable {
		s, ok := c.Get("token_model_limit")
		if ok {
			modelSet = s.(map[string]bool)
		} else {
			modelSet = map[string]bool{}
		}
	} else {
		// Get user's group and available models
		userId := c.GetInt("id")
		userGroup, err := model.GetUserGroup(userId, true)
		if err != nil {
			c.JSON(http.StatusOK, gin.H{
				"success": false,
				"message": "get user group failed",
			})
			return
		}

		// Consider token group if specified
		group := userGroup
		tokenGroup := c.GetString("token_group")
		if tokenGroup != "" {
			group = tokenGroup
		}

		// Get models available to the user's group
		models := model.GetGroupModels(group)
		modelSet = make(map[string]bool, len(models))
		for _, m := range models {
			modelSet[m] = true
		}
	}

	// Process each model to add enhanced information
	for modelName := range modelSet {
		enhanced := createEnhancedModel(modelName)
		userOpenAiModels = append(userOpenAiModels, enhanced)
	}

	// If no specific models are provided, return all models (for admin users)
	if len(userOpenAiModels) == 0 && c.GetBool("admin") {
		for _, openAIModel := range openAIModels {
			enhanced := createEnhancedModelFromOpenAI(openAIModel)
			userOpenAiModels = append(userOpenAiModels, enhanced)
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": map[string]interface{}{
			"models": userOpenAiModels,
			"total":  len(userOpenAiModels),
		},
	})
}

// SearchModels allows filtering models by various criteria
func SearchModels(c *gin.Context) {
	var request struct {
		ChannelType  *int     `json:"channel_type"`
		Categories   []string `json:"categories"`
		Category     string   `json:"category"`
		Capabilities []string `json:"capabilities"`
		Search       string   `json:"search"`
		SortBy       string   `json:"sort_by"`
		SortOrder    string   `json:"sort_order"`
		Page         int      `json:"page"`
		PageSize     int      `json:"page_size"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Invalid request format",
		})
		return
	}

	// Default pagination values
	if request.Page <= 0 {
		request.Page = 1
	}
	if request.PageSize <= 0 || request.PageSize > 100 {
		request.PageSize = 20
	}

	// Get all models first (using existing function logic)
	allModels := getAllAvailableModels(c)

	// Apply filters
	filteredModels := filterModels(allModels, request)

	// Apply sorting
	sortedModels := sortModels(filteredModels, request.SortBy, request.SortOrder)

	// Apply pagination
	startIndex := (request.Page - 1) * request.PageSize
	endIndex := startIndex + request.PageSize

	if startIndex >= len(sortedModels) {
		startIndex = 0
		endIndex = 0
	}

	if endIndex > len(sortedModels) {
		endIndex = len(sortedModels)
	}

	pagedModels := sortedModels
	if len(sortedModels) > 0 {
		pagedModels = sortedModels[startIndex:endIndex]
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": map[string]interface{}{
			"models": pagedModels,
			"total":  len(sortedModels),
			"page":   request.Page,
			"pages":  (len(sortedModels) + request.PageSize - 1) / request.PageSize,
		},
	})
}

// GetModelInfo returns detailed information about a specific model
func GetModelInfo(c *gin.Context) {
	var request struct {
		ModelID string `json:"model_id"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Invalid request format",
		})
		return
	}

	if request.ModelID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Model ID is required",
		})
		return
	}

	enhancedModel := createEnhancedModel(request.ModelID)

	// Get usage statistics (could be expanded with real data)
	modelStats, err := model.GetModelStatistics(request.ModelID)
	if err == nil && modelStats != nil {
		enhancedModel.Stats.TotalRequests = modelStats.TotalRequests
		enhancedModel.Stats.TotalTokens = modelStats.TotalTokens
		enhancedModel.Stats.AverageLatency = modelStats.AverageLatency
		enhancedModel.Stats.SuccessRate = modelStats.SuccessRate
	}

	// Make sure we're using the most accurate pricing data available
	modelRatio, _ := operation_setting.GetModelRatio(request.ModelID)
	completionRatio := operation_setting.GetCompletionRatio(request.ModelID)
	modelPrice, isFixedPrice := operation_setting.GetModelPrice(request.ModelID, false)

	// Calculate quota type based on fixed price flag
	quotaType := 0
	if isFixedPrice {
		quotaType = 1
	}

	// Calculate price per prompt and completion (per 1M tokens)
	pricePerPrompt := modelRatio * 2.0 // $0.002 per 1K tokens = $2.0 per 1M tokens
	pricePerCompletion := pricePerPrompt * completionRatio

	// Enhanced pricing information structure to match pricing API
	pricingInfo := map[string]interface{}{
		"model_name":           request.ModelID,
		"quota_type":           quotaType,
		"model_ratio":          modelRatio,
		"model_price":          modelPrice,
		"owner_by":             enhancedModel.OwnedBy,
		"completion_ratio":     completionRatio,
		"image_ratio":          1.0,
		"cache_ratio":          0.1,
		"cache_creation_ratio": 1.25,
		"price_per_prompt":     pricePerPrompt,
		"price_per_completion": pricePerCompletion,
		"model_type":           enhancedModel.Category,
		"token_unit":           1000000, // 1M tokens
	}

	// Get additional metadata for the model
	meta := getModelMetadata(request.ModelID, enhancedModel.ChannelType.Id, enhancedModel.Category)

	// Add the enhanced pricing information to metadata
	meta["pricing_details"] = pricingInfo

	// Update the enhanced model pricing to match the pricing API format
	enhancedModel.Pricing.ModelRatio = modelRatio
	enhancedModel.Pricing.CompletionRatio = completionRatio
	enhancedModel.Pricing.QuotaType = quotaType
	enhancedModel.Pricing.PricePerPrompt = pricePerPrompt
	enhancedModel.Pricing.PricePerCompletion = pricePerCompletion
	enhancedModel.Pricing.ModelPrice = modelPrice

	// Use the PER-MILLION token pricing for input/output price as well
	enhancedModel.Pricing.InputTokenPrice = pricePerPrompt
	enhancedModel.Pricing.OutputTokenPrice = pricePerCompletion

	// Get actual price from DB if available
	priceMap := operation_setting.GetModelPriceMap()
	if !isFixedPrice && priceMap != nil && priceMap[request.ModelID] > 0 {
		// Convert DB price (per token) to per million tokens
		actualPricePerMillion := priceMap[request.ModelID] * 1000000
		enhancedModel.Pricing.InputTokenPrice = actualPricePerMillion
		enhancedModel.Pricing.PricePerPrompt = actualPricePerMillion

		// Calculate completion prices (per million)
		enhancedModel.Pricing.OutputTokenPrice = actualPricePerMillion * completionRatio
		enhancedModel.Pricing.PricePerCompletion = actualPricePerMillion * completionRatio
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": map[string]interface{}{
			"model": enhancedModel,
			"meta":  meta,
		},
	})
}

// Helper function to get all available models for the current user/context
func getAllAvailableModels(c *gin.Context) []dto.EnhancedModel {
	models := make([]dto.EnhancedModel, 0)

	modelLimitEnable := c.GetBool("token_model_limit_enabled")
	if modelLimitEnable {
		s, ok := c.Get("token_model_limit")
		var tokenModelLimit map[string]bool
		if ok {
			tokenModelLimit = s.(map[string]bool)
		} else {
			tokenModelLimit = map[string]bool{}
		}

		for modelName := range tokenModelLimit {
			enhanced := createEnhancedModel(modelName)
			models = append(models, enhanced)
		}
	} else {
		userId := c.GetInt("id")
		userGroup, err := model.GetUserGroup(userId, true)
		if err != nil {
			return models
		}

		group := userGroup
		tokenGroup := c.GetString("token_group")
		if tokenGroup != "" {
			group = tokenGroup
		}

		availableModels := model.GetGroupModels(group)
		for _, modelName := range availableModels {
			enhanced := createEnhancedModel(modelName)
			models = append(models, enhanced)
		}
	}

	// For admin users, if no models are available, return all models
	if len(models) == 0 && c.GetBool("admin") {
		for _, openAIModel := range openAIModels {
			enhanced := createEnhancedModelFromOpenAI(openAIModel)
			models = append(models, enhanced)
		}
	}

	return models
}

// Helper function to filter models based on search criteria
func filterModels(models []dto.EnhancedModel, request struct {
	ChannelType  *int     `json:"channel_type"`
	Categories   []string `json:"categories"`
	Category     string   `json:"category"`
	Capabilities []string `json:"capabilities"`
	Search       string   `json:"search"`
	SortBy       string   `json:"sort_by"`
	SortOrder    string   `json:"sort_order"`
	Page         int      `json:"page"`
	PageSize     int      `json:"page_size"`
}) []dto.EnhancedModel {
	result := make([]dto.EnhancedModel, 0)

	for _, model := range models {
		// Apply channel type filter
		if request.ChannelType != nil && model.ChannelType.Id != *request.ChannelType {
			continue
		}

		// Apply category filter
		if request.Category != "" && model.Category != request.Category {
			continue
		}

		// Apply categories filter (multiple categories)
		if len(request.Categories) > 0 {
			found := false
			for _, category := range request.Categories {
				if model.Category == category {
					found = true
					break
				}
			}
			if !found {
				continue
			}
		}

		// Apply capabilities filter
		if len(request.Capabilities) > 0 {
			hasAllCapabilities := true
			for _, capability := range request.Capabilities {
				switch capability {
				case "streaming":
					if !model.Capabilities.Streaming {
						hasAllCapabilities = false
					}
				case "fine_tuning":
					if !model.Capabilities.FineTuning {
						hasAllCapabilities = false
					}
				case "functions":
					if !model.Capabilities.Functions {
						hasAllCapabilities = false
					}
				case "embeddings":
					if !model.Capabilities.Embeddings {
						hasAllCapabilities = false
					}
				case "image_generation":
					if !model.Capabilities.ImageGeneration {
						hasAllCapabilities = false
					}
				case "audio_transcription":
					if !model.Capabilities.AudioTranscription {
						hasAllCapabilities = false
					}
				}

				if !hasAllCapabilities {
					break
				}
			}

			if !hasAllCapabilities {
				continue
			}
		}

		// Apply search filter
		if request.Search != "" {
			searchLower := strings.ToLower(request.Search)
			modelNameLower := strings.ToLower(model.Id)
			modelGroupLower := strings.ToLower(model.Group)
			modelOwnerLower := strings.ToLower(model.OwnedBy)

			if !strings.Contains(modelNameLower, searchLower) &&
				!strings.Contains(modelGroupLower, searchLower) &&
				!strings.Contains(modelOwnerLower, searchLower) {
				continue
			}
		}

		result = append(result, model)
	}

	return result
}

// Helper function to sort models based on criteria
func sortModels(models []dto.EnhancedModel, sortBy string, sortOrder string) []dto.EnhancedModel {
	if sortBy == "" {
		return models
	}

	isAscending := sortOrder != "desc"

	sort.Slice(models, func(i, j int) bool {
		var comparison bool

		switch sortBy {
		case "name":
			comparison = models[i].Id < models[j].Id
		case "created":
			comparison = models[i].Created < models[j].Created
		case "owner":
			comparison = models[i].OwnedBy < models[j].OwnedBy
		case "category":
			comparison = models[i].Category < models[j].Category
		case "group":
			comparison = models[i].Group < models[j].Group
		case "max_tokens":
			comparison = models[i].Capabilities.MaxTokens < models[j].Capabilities.MaxTokens
		case "input_price":
			comparison = models[i].Pricing.InputTokenPrice < models[j].Pricing.InputTokenPrice
		case "output_price":
			comparison = models[i].Pricing.OutputTokenPrice < models[j].Pricing.OutputTokenPrice
		case "total_requests":
			comparison = models[i].Stats.TotalRequests < models[j].Stats.TotalRequests
		case "success_rate":
			comparison = models[i].Stats.SuccessRate < models[j].Stats.SuccessRate
		default:
			comparison = models[i].Id < models[j].Id
		}

		if isAscending {
			return comparison
		}
		return !comparison
	})

	return models
}

// Helper function to get additional metadata for a model
func getModelMetadata(modelID string, channelTypeID int, category string) map[string]interface{} {
	meta := map[string]interface{}{
		"channel_type":       channelTypeID,
		"endpoint":           getModelEndpoint(modelID, channelTypeID, category),
		"supported_features": getSupportedFeatures(modelID, category),
		"usage_examples":     getUsageExamples(modelID, category),
	}

	return meta
}

// Helper function to get model endpoint based on model ID and channel type
func getModelEndpoint(modelID string, channelTypeID int, category string) string {
	switch category {
	case "llm":
		return "/v1/chat/completions"
	case "embedding":
		return "/v1/embeddings"
	case "image":
		return "/v1/images/generations"
	case "voice":
		if strings.Contains(strings.ToLower(modelID), "tts") {
			return "/v1/audio/speech"
		}
		return "/v1/audio/transcriptions"
	case "reranking":
		return "/v1/rerank"
	default:
		return "/v1/chat/completions"
	}
}

// Helper function to get supported features for a model based on its capabilities
func getSupportedFeatures(modelID string, category string) []string {
	// Get basic capabilities based on model category
	features := make([]string, 0)

	switch category {
	case "llm":
		features = append(features, "chat", "text_generation")

		// Add more features based on model name
		if strings.Contains(strings.ToLower(modelID), "gpt-4") ||
			strings.Contains(strings.ToLower(modelID), "claude") ||
			strings.Contains(strings.ToLower(modelID), "gemini") {
			features = append(features, "function_calling")
		}

		if strings.Contains(strings.ToLower(modelID), "vision") ||
			strings.Contains(strings.ToLower(modelID), "gemini") {
			features = append(features, "vision")
		}

	case "embedding":
		features = append(features, "embeddings", "vector_search")

	case "image":
		features = append(features, "image_generation")
		if strings.Contains(strings.ToLower(modelID), "dall-e-3") {
			features = append(features, "image_edit")
		}

	case "voice":
		if strings.Contains(strings.ToLower(modelID), "tts") {
			features = append(features, "text_to_speech")
		} else {
			features = append(features, "speech_to_text")
		}

	case "reranking":
		features = append(features, "reranking", "search_relevance")

	case "music":
		features = append(features, "music_generation")
	}

	return features
}

// Helper function to get usage examples for a model
func getUsageExamples(modelID string, category string) []string {
	examples := make([]string, 0)

	switch category {
	case "llm":
		examples = append(examples, "curl -X POST \"https://api.example.com/v1/chat/completions\" \\\n  -H \"Authorization: Bearer $API_KEY\" \\\n  -H \"Content-Type: application/json\" \\\n  -d '{\n    \"model\": \""+modelID+"\",\n    \"messages\": [{\"role\": \"user\", \"content\": \"Hello!\"}]\n  }'")

	case "embedding":
		examples = append(examples, "curl -X POST \"https://api.example.com/v1/embeddings\" \\\n  -H \"Authorization: Bearer $API_KEY\" \\\n  -H \"Content-Type: application/json\" \\\n  -d '{\n    \"model\": \""+modelID+"\",\n    \"input\": \"The food was delicious and the waiter...\"\n  }'")

	case "image":
		examples = append(examples, "curl -X POST \"https://api.example.com/v1/images/generations\" \\\n  -H \"Authorization: Bearer $API_KEY\" \\\n  -H \"Content-Type: application/json\" \\\n  -d '{\n    \"model\": \""+modelID+"\",\n    \"prompt\": \"A cute baby sea otter\",\n    \"n\": 1,\n    \"size\": \"1024x1024\"\n  }'")

	case "voice":
		if strings.Contains(strings.ToLower(modelID), "tts") {
			examples = append(examples, "curl -X POST \"https://api.example.com/v1/audio/speech\" \\\n  -H \"Authorization: Bearer $API_KEY\" \\\n  -H \"Content-Type: application/json\" \\\n  -d '{\n    \"model\": \""+modelID+"\",\n    \"input\": \"Hello world\",\n    \"voice\": \"alloy\"\n  }'")
		} else {
			examples = append(examples, "curl -X POST \"https://api.example.com/v1/audio/transcriptions\" \\\n  -H \"Authorization: Bearer $API_KEY\" \\\n  -F \"file=@audio.mp3\" \\\n  -F \"model="+modelID+"\"")
		}

	case "reranking":
		examples = append(examples, "curl -X POST \"https://api.example.com/v1/rerank\" \\\n  -H \"Authorization: Bearer $API_KEY\" \\\n  -H \"Content-Type: application/json\" \\\n  -d '{\n    \"model\": \""+modelID+"\",\n    \"query\": \"What is the capital of France?\",\n    \"documents\": [\"Paris is the capital of France\", \"Berlin is in Germany\"]\n  }'")
	}

	return examples
}

// Helper function to create an enhanced model object from model name
func createEnhancedModel(modelName string) dto.EnhancedModel {
	var openAIModel dto.OpenAIModels

	if model, exists := openAIModelsMap[modelName]; exists {
		openAIModel = model
	} else {
		// Default values for custom models
		openAIModel = dto.OpenAIModels{
			Id:         modelName,
			Object:     "model",
			Created:    1626777600,
			OwnedBy:    "custom",
			Permission: getPermission(),
			Root:       modelName,
			Parent:     nil,
		}
	}

	enhanced := createEnhancedModelFromOpenAI(openAIModel)

	// Add available channels information
	enhanced.Channels = getChannelsForModel(modelName)

	return enhanced
}

// Helper function to get available channels for a model
func getChannelsForModel(modelName string) []dto.AvailableChannel {
	channels := make([]dto.AvailableChannel, 0)

	// Query the database to find channels that can serve this model
	abilities := model.GetModelAbilities(modelName)

	// Create a map to store unique channel IDs
	channelMap := make(map[int]bool)

	// Process each ability to extract channel information
	for _, ability := range abilities {
		if ability.Enabled && !channelMap[ability.ChannelId] {
			channelMap[ability.ChannelId] = true

			// Get channel details from database
			channel, err := model.GetChannelById(ability.ChannelId, false) // Add 'false' as second parameter
			if err != nil {
				continue
			}

			// Get channel type name
			channelTypeName := getChannelTypeNameById(channel.Type)

			// Add channel to result
			channels = append(channels, dto.AvailableChannel{
				Id:       channel.Id,
				Name:     channel.Name,
				Type:     channel.Type,
				TypeName: channelTypeName,
				Status:   channel.Status,
				Priority: int(derefInt64(ability.Priority)), // Convert *int64 to int
				Weight:   int(ability.Weight),               // Convert uint to int
				Enabled:  channel.Status == common.ChannelStatusEnabled,
			})
		}
	}

	return channels
}

// Helper function to safely dereference an *int64 with a default value of 0
func derefInt64(ptr *int64) int64 {
	if ptr == nil {
		return 0
	}
	return *ptr
}

// Helper function to get channel type name by ID
func getChannelTypeNameById(typeId int) string {
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
	}

	if name, exists := channelTypes[typeId]; exists {
		return name
	}
	return "Unknown"
}

// Helper function to create an enhanced model from an OpenAI model
func createEnhancedModelFromOpenAI(openAIModel dto.OpenAIModels) dto.EnhancedModel {
	modelName := openAIModel.Id
	modelType := model.DetermineModelType(modelName)

	// Get pricing information from operation settings
	modelRatio, _ := operation_setting.GetModelRatio(modelName)
	completionRatio := operation_setting.GetCompletionRatio(modelName)
	modelPrice, fixedPrice := operation_setting.GetModelPrice(modelName, false)

	// Calculate pricing details in the format matching the pricing API
	quotaType := 0
	if fixedPrice {
		quotaType = 1
	}

	// Calculate prices per 1M tokens directly (same as in pricing API)
	pricePerPrompt := modelRatio * 2.0 // $0.002 per 1K tokens = $2.0 per 1M tokens
	pricePerCompletion := pricePerPrompt * completionRatio

	// Get available channels for this model to use for channel type information
	availableChannels := getChannelsForModel(modelName)

	// Determine the channel type - use information from the first available channel if possible
	channelType := getChannelTypeForModel(openAIModel.OwnedBy, availableChannels)

	// Set capabilities based on model type
	capabilities := getModelCapabilities(modelName, modelType)

	// Create the enhanced model with pricing that matches pricing API format
	enhanced := dto.EnhancedModel{
		Id:          openAIModel.Id,
		Object:      openAIModel.Object,
		Created:     int64(openAIModel.Created),
		OwnedBy:     openAIModel.OwnedBy,
		Permission:  openAIModel.Permission,
		Root:        openAIModel.Root,
		Parent:      openAIModel.Parent,
		Category:    modelType,
		Group:       determineModelGroup(modelName),
		ChannelType: channelType,
		Stats: dto.ModelStats{
			TotalRequests:         0,
			TotalTokens:           0,
			AverageLatency:        0,
			SuccessRate:           100,
			LastUsed:              0,
			AverageCostPerRequest: 0,
		},
		Pricing: dto.ModelPricing{
			// Use the PER-MILLION prices for these fields
			InputTokenPrice:    pricePerPrompt,     // per 1M tokens (not per token)
			OutputTokenPrice:   pricePerCompletion, // per 1M tokens (not per token)
			TokenUnit:          1000000,            // 1M tokens
			MinimumCharge:      0,
			Currency:           "USD",
			PriceType:          getPriceType(fixedPrice),
			ModelRatio:         modelRatio,
			CompletionRatio:    completionRatio,
			QuotaType:          quotaType,
			PricePerPrompt:     pricePerPrompt,
			PricePerCompletion: pricePerCompletion,
			ModelPrice:         modelPrice,
		},
		Capabilities: capabilities,
		Channels:     availableChannels,
	}

	// If it's a fixed price model, set the price directly
	if fixedPrice {
		enhanced.Pricing.InputTokenPrice = modelPrice
		enhanced.Pricing.OutputTokenPrice = modelPrice
		enhanced.Pricing.PricePerPrompt = modelPrice
		enhanced.Pricing.PricePerCompletion = modelPrice
		enhanced.Pricing.PriceType = "fixed"
		enhanced.Pricing.DisplayPrice = fmt.Sprintf("$%.4f per request", modelPrice)
	} else {
		// For token-based pricing, add display prices for both input and output
		enhanced.Pricing.DisplayPrice = fmt.Sprintf("$%.2f / $%.2f per 1M tokens",
			enhanced.Pricing.InputTokenPrice,
			enhanced.Pricing.OutputTokenPrice)

		// Get actual price from DB if available
		priceMap := operation_setting.GetModelPriceMap()
		if priceMap != nil && priceMap[modelName] > 0 {
			// Convert DB price (per token) to per million tokens
			actualPricePerMillion := priceMap[modelName] * 1000000
			enhanced.Pricing.InputTokenPrice = actualPricePerMillion
			enhanced.Pricing.PricePerPrompt = actualPricePerMillion

			// Calculate completion prices (per million)
			enhanced.Pricing.OutputTokenPrice = actualPricePerMillion * completionRatio
			enhanced.Pricing.PricePerCompletion = actualPricePerMillion * completionRatio
		}
	}

	return enhanced
}

// Helper function to determine price type
func getPriceType(isFixedPrice bool) string {
	if isFixedPrice {
		return "fixed"
	}
	return "ratio"
}

// Helper function to determine model group/series
func determineModelGroup(modelName string) string {
	lowerName := strings.ToLower(modelName)

	if strings.HasPrefix(lowerName, "gpt-4") {
		return "GPT-4 Series"
	} else if strings.HasPrefix(lowerName, "gpt-3.5") {
		return "GPT-3.5 Series"
	} else if strings.HasPrefix(lowerName, "gemini") {
		return "Gemini Series"
	} else if strings.HasPrefix(lowerName, "claude") {
		return "Claude Series"
	} else if strings.Contains(lowerName, "embed") {
		return "Embedding Models"
	} else if strings.Contains(lowerName, "dall-e") {
		return "Image Generation Models"
	} else if strings.HasPrefix(lowerName, "mj_") {
		return "Midjourney Models"
	} else if strings.Contains(lowerName, "whisper") {
		return "Audio Models"
	} else if strings.Contains(lowerName, "rerank") {
		return "Reranking Models"
	}

	return "Other Models"
}

// Helper function to get channel type information
func getChannelTypeForModel(ownedBy string, availableChannels []dto.AvailableChannel) dto.ModelChannelType {
	// If we have available channels, use the first one for channel type information
	if len(availableChannels) > 0 {
		return dto.ModelChannelType{
			Id:       availableChannels[0].Type,
			Name:     availableChannels[0].Name,
			Type:     availableChannels[0].Type,
			TypeName: availableChannels[0].TypeName,
			Status:   availableChannels[0].Status,
			Enabled:  availableChannels[0].Enabled,
		}
	}

	// Fallback to mapping based on ownedBy if no channels are available
	channelTypeMap := map[string]dto.ModelChannelType{
		"openai":     {Id: 1, Name: "Open AI", Type: 1, TypeName: "OpenAI", Status: 1, Enabled: true},
		"anthropic":  {Id: 3, Name: "Claude", Type: 3, TypeName: "Claude", Status: 1, Enabled: true},
		"google":     {Id: 24, Name: "Google", Type: 24, TypeName: "Gemini", Status: 1, Enabled: true},
		"microsoft":  {Id: 2, Name: "Microsoft", Type: 2, TypeName: "Azure", Status: 1, Enabled: true},
		"midjourney": {Id: 9, Name: "Midjourney", Type: 9, TypeName: "Midjourney", Status: 1, Enabled: true},
		"baidu":      {Id: 6, Name: "Baidu", Type: 6, TypeName: "Baidu", Status: 1, Enabled: true},
		"zhipu":      {Id: 7, Name: "Zhipu", Type: 7, TypeName: "Zhipu", Status: 1, Enabled: true},
		"ali":        {Id: 11, Name: "Ali", Type: 11, TypeName: "Ali", Status: 1, Enabled: true},
		"tencent":    {Id: 18, Name: "Tencent", Type: 18, TypeName: "Tencent", Status: 1, Enabled: true},
		"mistral":    {Id: 20, Name: "Mistral", Type: 20, TypeName: "Mistral", Status: 1, Enabled: true},
		"cohere":     {Id: 33, Name: "Cohere", Type: 33, TypeName: "Cohere", Status: 1, Enabled: true},
		"jina":       {Id: 0, Name: "Jina", Type: 0, TypeName: "Jina", Status: 1, Enabled: true},
	}

	if channelType, exists := channelTypeMap[strings.ToLower(ownedBy)]; exists {
		return channelType
	}

	// Default channel type
	return dto.ModelChannelType{
		Id:       0,
		Name:     ownedBy,
		Type:     0,
		TypeName: strings.ToLower(ownedBy),
		Status:   1,
		Enabled:  true,
	}
}

// Helper function to set model capabilities based on model type
func getModelCapabilities(modelName string, modelType string) dto.ModelCapabilities {
	capabilities := dto.ModelCapabilities{
		Streaming:          true,
		FineTuning:         false,
		Functions:          false,
		Embeddings:         false,
		ImageGeneration:    false,
		AudioTranscription: false,
	}

	// Set max tokens based on model name
	if strings.Contains(strings.ToLower(modelName), "gpt-4") {
		if strings.Contains(modelName, "32k") {
			capabilities.MaxTokens = 32768
		} else if strings.Contains(modelName, "16k") {
			capabilities.MaxTokens = 16384
		} else {
			capabilities.MaxTokens = 8192
		}
		capabilities.Functions = true
	} else if strings.Contains(strings.ToLower(modelName), "gpt-3.5") {
		if strings.Contains(modelName, "16k") {
			capabilities.MaxTokens = 16384
		} else {
			capabilities.MaxTokens = 4096
		}
		capabilities.Functions = true
	} else if strings.Contains(strings.ToLower(modelName), "claude") {
		if strings.Contains(modelName, "opus") || strings.Contains(modelName, "sonnet") {
			capabilities.MaxTokens = 200000
		} else {
			capabilities.MaxTokens = 100000
		}
		capabilities.Functions = true
	} else if strings.Contains(strings.ToLower(modelName), "gemini") {
		if strings.Contains(modelName, "pro") {
			capabilities.MaxTokens = 32768
		} else {
			capabilities.MaxTokens = 8192
		}
		capabilities.Functions = true
	} else if modelType == "embedding" {
		capabilities.Embeddings = true
		capabilities.MaxTokens = 8192
	} else if modelType == "image" {
		capabilities.ImageGeneration = true
		capabilities.MaxTokens = 0
	} else if modelType == "voice" {
		capabilities.AudioTranscription = true
		capabilities.MaxTokens = 0
	} else if modelType == "reranking" {
		capabilities.MaxTokens = 4096
	}

	return capabilities
}

// Helper function to get actual model prices from DB
func getModelPricesFromDB() map[string]float64 {
	// Get the full pricing map from the database
	prices := operation_setting.GetModelPriceMap()
	if prices == nil {
		return make(map[string]float64)
	}
	return prices
}
