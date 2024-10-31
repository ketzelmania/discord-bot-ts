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

    for (const role of config.levels) {
        const roleLevel = config.levels[role];

        if (member.roles.includes(role) && level < roleLevel) level = roleLevel;
    }

    return level;
}
