<?php

if ($_POST['action'] === 'getArtist') {
    include_once('getArtist.php');
    $infos = array('datas' => $infos);
    
    if (!empty($_POST['template'])) {
        $infos['template'] = file_get_contents('artist.phtml');
    }
    
    echo json_encode($infos);
} else if ($_POST['action'] === 'getArtist2') {
    include_once('getArtist.php');
    $infos = array('datas' => $infos);
    
    if (!empty($_POST['template'])) {
        $infos['template'] = file_get_contents('artist2.phtml');
    }
    
    echo json_encode($infos);
}