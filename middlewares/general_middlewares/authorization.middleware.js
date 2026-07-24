
const ROLE_IDS={ADMIN:1,EXPERT:2,SERVICE_CENTER:3};

const authorization = function (role_required) {
        return function (request, response, next) {
            const user_role_id = request.profile_info.role_id;
            if (role_required.includes(user_role_id)) {
                next();
            } else {
                return response.status(403).json({
                    success: false,
                    message: "ACCESS_DENIED"
                });
            }
        }
};


export {authorization,ROLE_IDS};