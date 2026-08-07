// 홍능조경 홈페이지 스크립트

document.addEventListener(
    "DOMContentLoaded",
    function(){

        console.log(
            "홍능조경 홈페이지가 정상적으로 실행되었습니다."
        );

    }
);
function openImage(src){

let modal=document.getElementById("imageModal");

let img=document.getElementById("modalImage");

img.src=src;

modal.style.display="flex";

}


function closeImage(){

document.getElementById("imageModal").style.display="none";

}
