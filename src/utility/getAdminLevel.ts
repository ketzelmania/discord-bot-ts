import Eris from "eris";

/**
 * Gets the admin level of a given user based on roles
 *
 * @param {any} config - The global configuration
 * @param {Eris.Member} member - The member to query
 * @returns {number} The integer admin level of the user
 */
export function getAdminLevel(config: any, member: Eris.Member): number {
    let level = 0;

    const adminIds = Object.keys(config.adminIds).map(
        (key) => config.adminIds[key]
    );

    const levels = Object.keys(config.levels).map((key) => [
        key,
        config.levels[key],
    ]);

    // for (const userId of adminIds) {
    //     console.log(userId, member.id);
    //     if (userId == member.id) return 5;
    // }

    for (const roleData of levels) {
        const roleId = roleData[0];
        const roleLevel = roleData[1];

        if (member.roles.includes(roleId) && level < roleLevel)
            level = roleLevel;
    }

    return level;
}
