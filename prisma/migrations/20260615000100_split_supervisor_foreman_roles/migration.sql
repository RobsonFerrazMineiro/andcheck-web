INSERT INTO "roles" (
    "id", "code", "name", "description", "is_system", "updated_at"
)
VALUES
    (
        'role-supervisor',
        'SUPERVISOR',
        'Supervisor',
        'Perfil operacional de supervisao',
        true,
        CURRENT_TIMESTAMP
    ),
    (
        'role-encarregado',
        'ENCARREGADO',
        'Encarregado',
        'Perfil operacional de encarregado',
        true,
        CURRENT_TIMESTAMP
    )
ON CONFLICT ("code") DO UPDATE SET
    "name" = EXCLUDED."name",
    "description" = EXCLUDED."description",
    "is_system" = true,
    "updated_at" = CURRENT_TIMESTAMP;

INSERT INTO "role_permissions" (
    "id", "role_id", "permission_id"
)
SELECT
    'rp-' || substring(md5(target_role."id" || ':' || permission."permission_id") from 1 for 24),
    target_role."id",
    permission."permission_id"
FROM "roles" AS target_role
CROSS JOIN (
    SELECT role_permission."permission_id"
    FROM "role_permissions" AS role_permission
    JOIN "roles" AS legacy_role ON legacy_role."id" = role_permission."role_id"
    WHERE legacy_role."code" = 'SUPERVISOR_ENCARREGADO'
) AS permission
WHERE target_role."code" IN ('SUPERVISOR', 'ENCARREGADO')
ON CONFLICT ("role_id", "permission_id") DO NOTHING;
