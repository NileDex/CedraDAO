export const ABI = {
    "address": "0xea7fb3f7cf8efcd569529520f6c7fe691c34658320b7cacc869b6a33551c6b07",
    "name": "filter",
    "friends": [],
    "exposed_functions": [
        {
            "name": "advanced_filter",
            "visibility": "public",
            "is_entry": false,
            "is_view": true,
            "generic_type_params": [],
            "params": [
                "0x1::string::String",
                "0x1::string::String",
                "u64",
                "u64",
                "u8",
                "u64"
            ],
            "return": [
                "vector<0xea7fb3f7cf8efcd569529520f6c7fe691c34658320b7cacc869b6a33551c6b07::filter::DAOSearchResult>"
            ]
        },
        {
            "name": "filter_by_category",
            "visibility": "public",
            "is_entry": false,
            "is_view": true,
            "generic_type_params": [],
            "params": [
                "0x1::string::String",
                "u64"
            ],
            "return": [
                "vector<0xea7fb3f7cf8efcd569529520f6c7fe691c34658320b7cacc869b6a33551c6b07::filter::DAOSearchResult>"
            ]
        },
        {
            "name": "get_all_categories",
            "visibility": "public",
            "is_entry": false,
            "is_view": true,
            "generic_type_params": [],
            "params": [],
            "return": [
                "vector<0x1::string::String>"
            ]
        },
        {
            "name": "get_featured_dao_results",
            "visibility": "public",
            "is_entry": false,
            "is_view": true,
            "generic_type_params": [],
            "params": [],
            "return": [
                "vector<0xea7fb3f7cf8efcd569529520f6c7fe691c34658320b7cacc869b6a33551c6b07::filter::DAOSearchResult>"
            ]
        },
        {
            "name": "get_newest_daos",
            "visibility": "public",
            "is_entry": false,
            "is_view": true,
            "generic_type_params": [],
            "params": [
                "u64"
            ],
            "return": [
                "vector<0xea7fb3f7cf8efcd569529520f6c7fe691c34658320b7cacc869b6a33551c6b07::filter::DAOSearchResult>"
            ]
        },
        {
            "name": "search_daos",
            "visibility": "public",
            "is_entry": false,
            "is_view": true,
            "generic_type_params": [],
            "params": [
                "0x1::string::String",
                "u64"
            ],
            "return": [
                "vector<0xea7fb3f7cf8efcd569529520f6c7fe691c34658320b7cacc869b6a33551c6b07::filter::DAOSearchResult>"
            ]
        }
    ],
    "structs": [
        {
            "name": "DAOSearchResult",
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
                    "name": "address",
                    "type": "address"
                },
                {
                    "name": "name",
                    "type": "0x1::string::String"
                },
                {
                    "name": "description",
                    "type": "0x1::string::String"
                },
                {
                    "name": "category",
                    "type": "0x1::string::String"
                },
                {
                    "name": "logo",
                    "type": "0xea7fb3f7cf8efcd569529520f6c7fe691c34658320b7cacc869b6a33551c6b07::dao_core_file::ImageData"
                },
                {
                    "name": "created_at",
                    "type": "u64"
                },
                {
                    "name": "relevance_score",
                    "type": "u64"
                }
            ]
        }
    ]
}