package common

import (
	"encoding/json"
)

var UserUsableGroups = map[string]string{
	"default": "DefaultGroup",
	"vip":     "vipGroup",
}

func UserUsableGroups2JSONString() string {
	jsonBytes, err := json.Marshal(UserUsableGroups)
	if err != nil {
		SysError("error marshalling user groups: " + err.Error())
	}
	return string(jsonBytes)
}

func UpdateUserUsableGroupsByJSONString(jsonStr string) error {
	UserUsableGroups = make(map[string]string)
	return json.Unmarshal([]byte(jsonStr), &UserUsableGroups)
}

func GetUserUsableGroups(userGroup string) map[string]string {
	if userGroup == "" {
		// 如果userGroup for 空，BackUserUsableGroups
		return UserUsableGroups
	}
	// 如果userGroup不在UserUsableGroups中，BackUserUsableGroups + userGroup
	if _, ok := UserUsableGroups[userGroup]; !ok {
		appendUserUsableGroups := make(map[string]string)
		for k, v := range UserUsableGroups {
			appendUserUsableGroups[k] = v
		}
		appendUserUsableGroups[userGroup] = "user group"
		return appendUserUsableGroups
	}
	// 如果userGroup在UserUsableGroups中，BackUserUsableGroups
	return UserUsableGroups
}

func GroupInUserUsableGroups(groupName string) bool {
	_, ok := UserUsableGroups[groupName]
	return ok
}
