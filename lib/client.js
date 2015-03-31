var q = require('q')
    , azure = require("azure-storage")
    , extend = require('node.extend');

var Client = function () {
    this._azureClientPromise = null
};

Client.prototype.accountInfo = function (options) {
    throw {name : "NotImplementedError", message : "per user accountInfo not available with Azure"};
};

Client.prototype.checkQuota = function (options) {
    throw {name : "NotImplementedError", message : "per user quota not available with Azure"};
};

Client.prototype.createFile = function (fileName, parentIdentifier, content_buffer, options, filefog_options) {
    options = options || {};
    var path = createPath(fileName, parentIdentifier);
    return this._getClient(filefog_options)
        .then(function (client) {
            var deferred = q.defer();
            // Container exists and is public
            client.createBlockBlobFromText(filefog_options.root_identifier
                , path
                , content_buffer
                , function(error,result, response){
                    if(!error){
                        // File has been uploaded
                        deferred.resolve(result);
                    }
                    else{
                        deferred.reject(error)
                    }

                });
            return deferred.promise;
        })
};

Client.prototype.updateFile = function (identifier, content_buffer, options, filefog_options) {
    options = options || {};
    return this._getClient(filefog_options)
        .then(function (client) {
            var deferred = q.defer();
            // Container exists and is public
            client.createBlockBlobFromText(filefog_options.root_identifier
                , identifier
                , content_buffer
                , function(error,result){
                    if(!error){
                        // File has been uploaded
                        deferred.resolve(result);
                    }
                    else{
                        deferred.reject(error)
                    }

                });
            return deferred.promise;
        })
};

Client.prototype.deleteFile = function (identifier,options,filefog_options) {
    return this._getClient(filefog_options)
        .then(function(client){
            var deferred = q.defer();
            client.deleteBlob(filefog_options.root_identifier, identifier, function (err, response) {
                if (err) return deferred.reject(err);
                return deferred.resolve(response);
            });
            return deferred.promise;
        })
};

Client.prototype.downloadFile = function (identifier,options, filefog_options){
    options = options || {};
    var MemoryStream = require('memorystream');
    return this._getClient(filefog_options).then(function (client) {
        var deferred = q.defer();
        var memstream = new MemoryStream(null, {readable : false});
        client.getBlobToStream(filefog_options.root_identifier, identifier, memstream, function (err, response) {
            if (err) return deferred.reject(err);
            return deferred.resolve({data:memstream.toBuffer(),response:response});
        });
        return deferred.promise;
    })
};

Client.prototype.getFileInformation = function (identifier,options, filefog_options) {
    options = options || {};
    return this._getClient(filefog_options)
        .then(function (client) {
            var deferred = q.defer();
            client.getBlobProperties(filefog_options.root_identifier, identifier, options, function (err,  response) {
                if (err) return deferred.reject(err);
                return deferred.resolve(response);
            });
            return deferred.promise;
        })
};

Client.prototype.updateFileInformation = function (current_identifier,fileName, parentIdentifier, options, filefog_options) {

    var current_parts = splitPath(current_identifier);
    var destParent = current_parts[0];
    var destName = current_parts[1];
    if(fileName){
        destName = fileName;
    }
    if(parentIdentifier){
        destParent = parentIdentifier;
    }

    var destination_identifier = createPath(destName, destParent);


    return this._getClient(filefog_options)
        .then(function (client) {
            var deferred = q.defer();
            client.startCopyBlob(client.getUrl(filefog_options.root_identifier, current_identifier),
                filefog_options.root_identifier,
                destination_identifier,
                function (err, response) {
                    if (err) return deferred.reject(err);
                    return deferred.resolve(response);
                })
            return deferred.promise;
        })
};

Client.prototype.createFolder = function (folderName, parentIdentifier, options) {
    //passthrough method. cannot create folders in azure
    return q({identifier:createPath(folderName, parentIdentifier)})
};

Client.prototype.deleteFolder = function(identifier, options,filefog_options){
    //throw {name : "NotImplementedError", message : "deleting folders not available with Azure"};
    var self = this;
    return this.retrieveFolderItems(identifier, options, filefog_options)
        .then(function(folder_items){

            var promises = folder_items.content.map(function(items) {
                return self.deleteFile(items,options, filefog_options)
            })
            return q.all(promises);
        })
}

Client.prototype.getFolderInformation = function (identifier, options){
    throw {name : "NotImplementedError", message : "getting folder information not available with Azure"};
}

Client.prototype.retrieveFolderItems = function (identifier,options,filefog_options) {
    identifier = identifier || '';
    options = extend({'include':'metadata'}, options || {});
    var pagination = options.page || null
    if(options.page)
        delete options.page

    var path = createPath(identifier)
    return this._getClient(filefog_options)
        .then(function (client) {
            var deferred = q.defer();
            client.listBlobDirectoriesSegmentedWithPrefix(filefog_options.root_identifier, path, pagination, options, function (err, result, response) {
                if (err) return deferred.reject(err);
                return deferred.resolve(response);
            });
            return deferred.promise;
        })
};

///////////////////////////////////////////////////////////////////////////////
// Event Methods
///////////////////////////////////////////////////////////////////////////////


///////////////////////////////////////////////////////////////////////////////
// Private Methods
///////////////////////////////////////////////////////////////////////////////

Client.prototype._getClient = function(filefog_options) {
    if (this._azureClientPromise) return this._azureClientPromise;
    var deferred = q.defer();
    var blobService = azure.createBlobService(this.config.client_key, this.config.client_secret);
    blobService.createContainerIfNotExists(filefog_options.root_identifier
        , {publicAccessLevel : 'blob'}
        , function(error){
            if (error) {
                deferred.reject(error)
            }
            else{
                deferred.resolve(blobService);//resolved successfully.
            }
        });
    return deferred.promise;


    this._azureClientPromise = deferred.promise;
    return this._azureClientPromise;
};

function createPath(fileName, parentIdentifier) {
    if(parentIdentifier){
        return parentIdentifier +  '/' + fileName;
    }
    else{
        return fileName;
    }
}
function splitPath(identifier){
    var parts = identifier.split('/');
    var last = parts.pop();

    var path = (parts.length >1 ? parts.join('/') : "/");
    return [path, last];

}

function errorHandler(error) {
    if (error) {
        return error;
//        switch (error.status) {
//            case Dropbox.ApiError.INVALID_TOKEN:
//                //var FFTokenRejected = errorTypes.FFTokenRejected;
//                return new Error('User token has expired');
//
//            case Dropbox.ApiError.NOT_FOUND:
//                // The file or folder you tried to access is not in the user's Dropbox.
//                // Handling this error is specific to your application.
//                //var FFItemDoesNotExist = errorTypes.FFItemDoesNotExist;
//                return new Error();
//
//            case Dropbox.ApiError.OVER_QUOTA:
//                // The user is over their Dropbox quota.
//                // Tell them their Dropbox is full. Refreshing the page won't help.
//                //var FFOverQuota = errorTypes.FFOverQuota
//                return new Error();
//
//            case Dropbox.ApiError.RATE_LIMITED:
//                // Too many API requests. Tell the user to try again later.
//                // Long-term, optimize your code to use fewer API calls.
//                var FFRateLimit = errorTypes.FFRateLimit;
//                return new FFRateLimit();
//
//            case Dropbox.ApiError.NETWORK_ERROR:
//                // An error occurred at the XMLHttpRequest layer.
//                // Most likely, the user's network connection is down.
//                // API calls will not succeed until the user gets back online.
//                return error;
//
//            case Dropbox.ApiError.INVALID_PARAM:
//                var FFParameterRejected = errorTypes.FFParameterRejected
//                return new FFParameterRejected();
//            case Dropbox.ApiError.OAUTH_ERROR:
//                var FFTokenRejected = errorTypes.FFTokenRejected
//                return new FFTokenRejected();
//            case Dropbox.ApiError.INVALID_METHOD:
//            default:
//                // Caused by a bug in dropbox.js, in your application, or in Dropbox.
//                // Tell the user an error occurred, ask them to refresh the page.
//                return error;
//        }
    }
    return false;
};


module.exports = Client;