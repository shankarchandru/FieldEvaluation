<?php
$uploadZipdir = 'C:\\arcgisserver\\data\\uploads\\archives\\';
$uploaddir = 'C:\\arcgisserver\\data\\uploads\\';
$uploadfile = $uploadZipdir . $_FILES[uploadedfile][name];
if (move_uploaded_file($_FILES[uploadedfile][tmp_name], $uploadfile)) {
$zip = new ZipArchive;
$res = $zip->open($uploadfile);
if ($res === TRUE) {
  $zip->extractTo($uploaddir);
  $zip->close();
  echo json_encode($_FILES);  
} else {
	echo "Extraction failed";
}
} else {
echo "upload failed";
echo '<pre>';
echo 'Here is some more debugging info:';
print_r($_FILES);
print "</pre>";
}

?>