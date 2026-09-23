import { Router } from "express";
import Product from "./models.js";

const router=Router()

router.get("/",async(req,res)=>{
    const products= await Product.find({})
    res.render("products/list",{title:"Shop",products})
})

router.get("/categories/:category",async(req,res)=>{
    const categories=await Product.find({category:req.params.category})
    res.render("products/list",{title:req.params.category,products:categories})
})

router.get('/search',async(req,res)=>{
    const {searchValue}=req.body
    const products=await Product.find({name:searchValue})
    res.render("products/list",{title:searchValue,products})
})

router.get("/:id",async(req,res)=>{
    try {
        const product = await Product.findById(req.params.id)
        if (!product) {
            return res.status(404).render("404",{title:"Not Found",error:{statusCode:404,message:"Product not found"},user:req.user})
        }
        res.render("products/detail",{title:product.name,product})
    } catch (error) {
        res.status(500).render("500",{title:"Server Error",error:{statusCode:500,message:"Failed to load product"},user:req.user})
    }
})

router.get("/create",(req,res)=>{
    res.render("products/create")
})

router.post("/create",async(req,res)=>{
    const {name,price,discount,category}=req.body

    try {
        await Product.create({name,price,discount,category})
        res.redirect("/products/")
    } catch (error) {
        res.locals.msg="Error creating a product"
         res.render("products/create")
    }
})

router.get("/cart",(req,res)=>{
    res.render("products/cart",{title:"Shopping Cart",user:req.user})
})

router.post("/cart/add",(req,res)=>{
    const {productId,quantity}=req.body
    res.render("products/cart",{title:"Shopping Cart",user:req.user,added:true})
})



export default router;