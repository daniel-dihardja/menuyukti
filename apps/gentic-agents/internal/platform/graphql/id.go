package graphql

import (
	"encoding/json"
	"fmt"
	"strconv"
)

// ID is a GraphQL ID value. JSON may encode it as a string or a number depending on the server.
type ID string

func (id *ID) UnmarshalJSON(b []byte) error {
	if len(b) == 0 {
		return fmt.Errorf("graphql: empty id")
	}
	if b[0] == '"' {
		var s string
		if err := json.Unmarshal(b, &s); err != nil {
			return err
		}
		*id = ID(s)
		return nil
	}
	var n json.Number
	if err := json.Unmarshal(b, &n); err == nil {
		*id = ID(n.String())
		return nil
	}
	var f float64
	if err := json.Unmarshal(b, &f); err == nil {
		*id = ID(strconv.FormatInt(int64(f), 10))
		return nil
	}
	return fmt.Errorf("graphql: cannot decode id from JSON")
}
