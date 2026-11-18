-- Role rows required by the "fk(role_id)" constraints on security.users / *.invites.
-- Must match ROLE_IDS in middlewares/general_middlewares/authorization.middleware.js
INSERT INTO security.roles (role_id, role_name) VALUES
    (1, 'ADMIN'),
    (2, 'EXPERT'),
    (3, 'SERVICE_CENTER')
ON CONFLICT DO NOTHING;
