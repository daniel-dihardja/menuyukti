package toolutil

import (
	"encoding/json"
	"reflect"
	"strings"
)

// SchemaFromStruct generates a JSON Schema object from a Go struct's json and schema tags.
// Supports string, int, float64, bool, and *string (optional string) fields.
// Use struct tags:
//   - json:"fieldname" — maps to JSON field name
//   - schema:"required" — marks field as required
//
// Example:
//
//	type updateProfileInput struct {
//	    Summary string `json:"summary" schema:"required"`
//	    Detail  *string `json:"detail"` // optional
//	}
//	schema := SchemaFromStruct(updateProfileInput{})
func SchemaFromStruct(v interface{}) json.RawMessage {
	t := reflect.TypeOf(v)
	if t.Kind() == reflect.Ptr {
		t = t.Elem()
	}

	properties := make(map[string]interface{})
	required := []string{}

	for i := 0; i < t.NumField(); i++ {
		field := t.Field(i)

		// Skip unexported fields
		if field.PkgPath != "" {
			continue
		}

		// Get JSON tag
		jsonTag := field.Tag.Get("json")
		if jsonTag == "" {
			jsonTag = field.Name
		}
		jsonTag = strings.Split(jsonTag, ",")[0] // Strip options

		// Check for required tag
		schemaTag := field.Tag.Get("schema")
		if strings.Contains(schemaTag, "required") {
			required = append(required, jsonTag)
		}

		// Determine type
		fieldType := field.Type
		isOptional := fieldType.Kind() == reflect.Ptr

		if isOptional {
			fieldType = fieldType.Elem()
		}

		propSchema := map[string]interface{}{"type": getJSONType(fieldType)}

		if field.Tag.Get("description") != "" {
			propSchema["description"] = field.Tag.Get("description")
		}

		properties[jsonTag] = propSchema
	}

	schema := map[string]interface{}{
		"type":                 "object",
		"properties":           properties,
		"additionalProperties": false,
	}

	if len(required) > 0 {
		schema["required"] = required
	}

	data, _ := json.Marshal(schema)
	return json.RawMessage(data)
}

func getJSONType(t reflect.Type) string {
	switch t.Kind() {
	case reflect.String:
		return "string"
	case reflect.Int, reflect.Int8, reflect.Int16, reflect.Int32, reflect.Int64,
		reflect.Uint, reflect.Uint8, reflect.Uint16, reflect.Uint32, reflect.Uint64:
		return "integer"
	case reflect.Float32, reflect.Float64:
		return "number"
	case reflect.Bool:
		return "boolean"
	case reflect.Slice:
		return "array"
	case reflect.Map:
		return "object"
	default:
		return "string"
	}
}
