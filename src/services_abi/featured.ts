export const ABI = {
    "address": "0xea7fb3f7cf8efcd569529520f6c7fe691c34658320b7cacc869b6a33551c6b07",
    "name": "featured",
    "friends": [],
    "exposed_functions": [
        {
            "name": "get_badge_info",
            "visibility": "public",
            "is_entry": false,
            "is_view": true,
            "generic_type_params": [],
            "params": [
                "address"
            ],
            "return": [
                "u64",
                "u64",
                "u64",
                "bool"
            ]
        },
        {
            "name": "get_badge_pricing",
            "visibility": "public",
            "is_entry": false,
            "is_view": true,
            "generic_type_params": [],
            "params": [],
            "return": [
                "u64",
                "u64"
            ]
        },
        {
            "name": "get_featured_daos",
            "visibility": "public",
            "is_entry": false,
            "is_view": true,
            "generic_type_params": [],
            "params": [],
            "return": [
                "vector<address>"
            ]
        },
        {
            "name": "get_fee_recipient",
            "visibility": "public",
            "is_entry": false,
            "is_view": true,
            "generic_type_params": [],
            "params": [],
            "return": [
                "address"
            ]
        },
        {
            "name": "is_dao_featured",
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
            "name": "prune_expired_badges",
            "visibility": "public",
            "is_entry": true,
            "is_view": false,
            "generic_type_params": [],
            "params": [],
            "return": []
        },
        {
            "name": "purchase_featured_badge",
            "visibility": "public",
            "is_entry": true,
            "is_view": false,
            "generic_type_params": [],
            "params": [
                "&signer",
                "address",
                "bool"
            ],
            "return": []
        },
        {
            "name": "update_badge_pricing",
            "visibility": "public",
            "is_entry": true,
            "is_view": false,
            "generic_type_params": [],
            "params": [
                "&signer",
                "u64",
                "u64"
            ],
            "return": []
        },
        {
            "name": "update_fee_recipient",
            "visibility": "public",
            "is_entry": true,
            "is_view": false,
            "generic_type_params": [],
            "params": [
                "&signer",
                "address"
            ],
            "return": []
        }
    ],
    "structs": [
        {
            "name": "BadgeData",
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
                    "name": "purchased_at",
                    "type": "u64"
                },
                {
                    "name": "expires_at",
                    "type": "u64"
                },
                {
                    "name": "duration_months",
                    "type": "u64"
                }
            ]
        },
        {
            "name": "BadgePurchased",
            "is_native": false,
            "is_event": true,
            "abilities": [
                "drop",
                "store"
            ],
            "generic_type_params": [],
            "fields": [
                {
                    "name": "dao_address",
                    "type": "address"
                },
                {
                    "name": "purchaser",
                    "type": "address"
                },
                {
                    "name": "duration_months",
                    "type": "u64"
                },
                {
                    "name": "amount_paid",
                    "type": "u64"
                },
                {
                    "name": "expires_at",
                    "type": "u64"
                },
                {
                    "name": "timestamp",
                    "type": "u64"
                }
            ]
        },
        {
            "name": "FeaturedRegistry",
            "is_native": false,
            "is_event": false,
            "abilities": [
                "key"
            ],
            "generic_type_params": [],
            "fields": [
                {
                    "name": "badges",
                    "type": "0x1::simple_map::SimpleMap<address, 0xea7fb3f7cf8efcd569529520f6c7fe691c34658320b7cacc869b6a33551c6b07::featured::BadgeData>"
                },
                {
                    "name": "featured_addresses",
                    "type": "vector<address>"
                },
                {
                    "name": "monthly_price",
                    "type": "u64"
                },
                {
                    "name": "yearly_price",
                    "type": "u64"
                },
                {
                    "name": "fee_recipient",
                    "type": "address"
                }
            ]
        }
    ]
}