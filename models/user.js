"use strict";

module.exports = function(sequelize, DataTypes) {
  var User = sequelize.define("User", {
    spotifyId: DataTypes.INTEGER,
    accessToken: DataTypes.STRING,
    refreshToken: DataTypes.STRING
  }, {
    classMethods: {
      associate: function(models) {
        // associations can be defined here
      }
    }
  });

  return User;
};
