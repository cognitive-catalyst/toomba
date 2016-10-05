function pgClean(string) {
    return string.replace(/"/g, '\\"').replace(/'/g, "''");
}

module.exports = {
    pgClean
}
