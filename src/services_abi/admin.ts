export const ABI = {
  "address": "0xea7fb3f7cf8efcd569529520f6c7fe691c34658320b7cacc869b6a33551c6b07",
  "name": "admin",
  "friends": [],
  "exposed_functions": [
    {
      "name": "add_admin",
      "visibility": "public",
      "is_entry": true,
      "is_view": false,
      "generic_type_params": [],
      "params": [
        "&signer",
        "address",
        "address",
        "u8",
        "u64"
      ],
      "return": []
    },
    {
      "name": "exists_admin_list",
      "visibility": "public",
      "is_entry": false,
      "is_view": true,
      "generic_type_params": [],
      "params": [
        "address"
      ],
      "return": [
        "bool"
      ]
    },
    {
      "name": "get_admin_count",
      "visibility": "public",
      "is_entry": false,
      "is_view": true,
      "generic_type_params": [],
      "params": [
        "address"
      ],
      "return": [
        "u64"
      ]
    },
    {
      "name": "get_admin_role",
      "visibility": "public",
      "is_entry": false,
      "is_view": true,
      "generic_type_params": [],
      "params": [
        "address",
        "address"
      ],
      "return": [
        "u8"
      ]
    },
    {
      "name": "get_admins",
      "visibility": "public",
      "is_entry": false,
      "is_view": true,
      "generic_type_params": [],
      "params": [
        "address"
      ],
      "return": [
        "vector<address>"
      ]
    },
    {
      "name": "get_min_temp_admin_duration",
      "visibility": "public",
      "is_entry": false,
      "is_view": true,
      "generic_type_params": [],
      "params": [
        "address"
      ],
      "return": [
        "u64"
      ]
    },
    {
      "name": "init_admin",
      "visibility": "public",
      "is_entry": false,
      "is_view": false,
      "generic_type_params": [],
      "params": [
        "&signer",
        "u64"
      ],
      "return": []
    },
    {
      "name": "is_admin",
      "visibility": "public",
      "is_entry": false,
      "is_view": true,
      "generic_type_params": [],
      "params": [
        "address",
        "address"
      ],
      "return": [
        "bool"
      ]
    },
    {
      "name": "not_admin_error_code",
      "visibility": "public",
      "is_entry": false,
      "is_view": true,
      "generic_type_params": [],
      "params": [],
      "return": [
        "u64"
      ]
    },
    {
      "name": "remove_admin",
      "visibility": "public",
      "is_entry": true,
      "is_view": false,
      "generic_type_params": [],
      "params": [
        "&signer",
        "address",
        "address"
      ],
      "return": []
    },
    {
      "name": "role_standard",
      "visibility": "public",
      "is_entry": false,
      "is_view": false,
      "generic_type_params": [],
      "params": [],
      "return": [
        "u8"
      ]
    },
    {
      "name": "role_super_admin",
      "visibility": "public",
      "is_entry": false,
      "is_view": false,
      "generic_type_params": [],
      "params": [],
      "return": [
        "u8"
      ]
    },
    {
      "name": "role_temporary",
      "visibility": "public",
      "is_entry": false,
      "is_view": false,
      "generic_type_params": [],
      "params": [],
      "return": [
        "u8"
      ]
    },
    {
      "name": "set_min_temp_admin_duration",
      "visibility": "public",
      "is_entry": true,
      "is_view": false,
      "generic_type_params": [],
      "params": [
        "&signer",
        "address",
        "u64"
      ],
      "return": []
    }
  ],
  "structs": [
    {
      "name": "Admin",
      "is_native": false,
      "is_event": false,
      "abilities": [
        "copy",
        "drop",
        "store"
      ],
      "generic_type_params": [],
      "fields": [
        {
          "name": "role",
          "type": "u8"
        },
        {
          "name": "added_at",
          "type": "u64"
        },
        {
          "name": "expires_at",
          "type": "u64"
        }
      ]
    },
    {
      "name": "AdminChanged",
      "is_native": false,
      "is_event": true,
      "abilities": [
        "drop",
        "store"
      ],
      "generic_type_params": [],
      "fields": [
        {
          "name": "actor",
          "type": "address"
        },
        {
          "name": "target",
          "type": "address"
        },
        {
          "name": "action",
          "type": "vector<u8>"
        },
        {
          "name": "role",
          "type": "u8"
        },
        {
          "name": "expires_at",
          "type": "u64"
        }
      ]
    },
    {
      "name": "AdminList",
      "is_native": false,
      "is_event": false,
      "abilities": [
        "key"
      ],
      "generic_type_params": [],
      "fields": [
        {
          "name": "admins",
          "type": "0x1::simple_map::SimpleMap<address, 0xea7fb3f7cf8efcd569529520f6c7fe691c34658320b7cacc869b6a33551c6b07::admin::Admin>"
        },
        {
          "name": "min_super_admins",
          "type": "u64"
        },
        {
          "name": "min_temp_admin_duration",
          "type": "u64"
        }
      ]
    }
  ]
}