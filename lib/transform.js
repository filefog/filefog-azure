var transform = {};

transform.accountInfo = function(account_response){

    var transform = {};
    transform.name = account_response.name;
    transform.email = account_response.email;
    transform.avatar_url = '';
    transform.created_date = null;
    transform.modified_date = null;
    transform.id = account_response.uid;
    transform._raw = account_response;
    return transform;
};

transform.checkQuota = function (quota_response){
    var transform = {};
    transform.total_bytes = quota_response.quota; //total space allocated in bytes
    transform.used_bytes = quota_response.usedQuota; //bytes used.
    transform.limits= {
    }
    transform._raw = quota_response;
    return transform;
};

transform.deleteFile = function(deletion_response){
    var transform = {};
    transform.success = deletion_response.isSuccessful;
    transform._raw = deletion_response;
    return transform;
};

transform.downloadFile = function(download_response){
    var transform = {};
    //TODO: figure out what the download file response should be.
    transform.data = download_response.data;
    transform.headers = {};
    transform._raw = download_response;
    return transform;
};

transform.getFileInformation = function (file_response){

    var transform = {};
    transform.is_file = true;
    transform.is_folder = false;
    transform.etag = file_response.etag;
    transform.identifier = file_response.blob;
    var path_parts = file_response.blob.split('/')
    var filename = path_parts.pop();
    var parent_path = path_parts.join('/');
    transform.parent_identifier = parent_path;
    transform.mimetype = file_response.contentType || null;
    //transform.created_date = new Date(file_response.lastModified);
    transform.modified_date = new Date(file_response.lastModified);
    transform.name = filename;
    transform.description = '';
    transform.extension = filename.split('.')[1]
    transform.checksum = file_response.contentMD5;
    transform.file_size = file_response.contentLength || null;
    transform._raw = file_response;
    return transform;
};

transform.deleteFolder = function(deletion_response){
    var transform = {};
    transform.success = true;
    transform._raw = deletion_response;
    return transform;
};


transform.getFolderInformation = function(folder_response){
    var transform = {};
    transform.is_file = false;
    transform.is_folder = true;
    //transform.etag = folder_response.versionTag;
    transform.identifier = folder_response.identifier.toLowerCase();
    var path_parts = folder_response.identifier.split('/')
    var path_name = path_parts.pop();
    var parent_path = null;
    if(path_parts.length>0)
        parent_path = path_parts.join('/').toLowerCase();
    transform.parent_identifier = parent_path;
    //transform.created_date = new Date(folder_response.modifiedAt);
    //transform.modified_date = new Date(folder_response.modifiedAt);
    transform.name = path_name;
    transform.description = '';
    transform._raw = folder_response;
    return transform;
};


transform.retrieveFolderItems = function(items_response){
    var transform = {};
    transform.total_items = null;
    transform.content = [];
    if(!items_response.body.EnumerationResults.Blobs){
        return transform;
    }
    transform.content = items_response.body.EnumerationResults.Blobs.Blob.map(function(current_item){
        var transform_item = {};
        transform_item.is_file = true;
        transform_item.is_folder = false;
        transform_item.etag = current_item.Properties.Etag;
        transform_item.identifier = items_response.body.EnumerationResults.Blobs.BlobPrefix.Name + current_item.Name;
        var path_parts = transform_item.identifier.split('/')
        path_parts.pop();
        var parent_path = path_parts.join('/');
        transform_item.parent_identifier = parent_path;
        transform_item.mimetype = current_item.Properties['Content-Type'] || null;
        //transform.created_date = new Date(file_response.lastModified);
        transform_item.modified_date = new Date(current_item.Properties['Last-Modified'] );
        transform_item.name = current_item.Name;
        transform_item.description = '';
        transform_item.extension = current_item.Name.split('.')[1]
        transform_item.checksum = current_item.Properties['Content-MD5'];
        transform_item.file_size = current_item.Properties['Content-Length'] || null;
        transform_item._raw = current_item;
        return transform_item;
    });
    transform.total_items = transform.content.length;
    return transform;
};

///////////////////////////////////////////////////////////////////////////////
// Event transforms


///////////////////////////////////////////////////////////////////////////////
// Aliases
transform.createFile = transform.getFileInformation;
transform.createFolder = transform.getFolderInformation;
transform.updateFile = transform.getFileInformation;
transform.updateFileInformation = transform.getFileInformation;

///////////////////////////////////////////////////////////////////////////////
// OAuth transforms


module.exports = transform;
