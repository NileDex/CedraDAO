export const ABI = {
  "address": "0xea7fb3f7cf8efcd569529520f6c7fe691c34658320b7cacc869b6a33551c6b07",
  "name": "time_security",
  "friends": [],
  "exposed_functions": [
    {
      "name": "get_max_vesting_period",
      "visibility": "public",
      "is_entry": false,
      "is_view": false,
      "generic_type_params": [],
      "params": [],
      "return": [
        "u64"
      ]
    },
    {
      "name": "get_max_voting_period",
      "visibility": "public",
      "is_entry": false,
      "is_view": false,
      "generic_type_params": [],
      "params": [],
      "return": [
        "u64"
      ]
    },
    {
      "name": "get_min_vesting_period",
      "visibility": "public",
      "is_entry": false,
      "is_view": false,
      "generic_type_params": [],
      "params": [],
      "return": [
        "u64"
      ]
    },
    {
      "name": "get_min_voting_period",
      "visibility": "public",
      "is_entry": false,
      "is_view": false,
      "generic_type_params": [],
      "params": [],
      "return": [
        "u64"
      ]
    },
    {
      "name": "get_safe_future_time",
      "visibility": "public",
      "is_entry": false,
      "is_view": false,
      "generic_type_params": [],
      "params": [
        "u64"
      ],
      "return": [
        "u64"
      ]
    },
    {
      "name": "has_time_elapsed_safely",
      "visibility": "public",
      "is_entry": false,
      "is_view": false,
      "generic_type_params": [],
      "params": [
        "u64",
        "u64"
      ],
      "return": [
        "bool"
      ]
    },
    {
      "name": "validate_chronological_order",
      "visibility": "public",
      "is_entry": false,
      "is_view": false,
      "generic_type_params": [],
      "params": [
        "&vector<u64>"
      ],
      "return": []
    },
    {
      "name": "validate_current_time_reasonable",
      "visibility": "public",
      "is_entry": false,
      "is_view": false,
      "generic_type_params": [],
      "params": [
        "u64",
        "u64"
      ],
      "return": []
    },
    {
      "name": "validate_time_period",
      "visibility": "public",
      "is_entry": false,
      "is_view": false,
      "generic_type_params": [],
      "params": [
        "u64",
        "u64",
        "u64",
        "u64"
      ],
      "return": []
    },
    {
      "name": "validate_vesting_period",
      "visibility": "public",
      "is_entry": false,
      "is_view": false,
      "generic_type_params": [],
      "params": [
        "u64",
        "u64"
      ],
      "return": []
    },
    {
      "name": "validate_voting_period",
      "visibility": "public",
      "is_entry": false,
      "is_view": false,
      "generic_type_params": [],
      "params": [
        "u64",
        "u64"
      ],
      "return": []
    }
  ],
  "structs": []
}