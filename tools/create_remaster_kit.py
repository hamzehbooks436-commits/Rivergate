"""Author the remaster kit inside the connected Blender using Blender MCP.
Uses a separate scene; existing scenes and user assets are preserved.
"""
import bpy, math, os, json
from mathutils import Vector
ROOT=r'C:\Users\hamze\Home\Desktop\Folder_1\City Game Project'
OUT=os.path.join(ROOT,'assets','models')
SCENE=bpy.data.scenes.get('Rivergate Remastered - Asset workshop') or bpy.data.scenes.new('Rivergate Remastered - Asset workshop')
bpy.context.window.scene=SCENE
PALETTE={'stone':('#c8c8b9',.85,0),'cream':('#ded6c1',.82,0),'brick':('#bd9079',.8,0),'roof':('#617b80',.65,.25),'glass':('#527b8e',.21,.38),'metal':('#a9b9ba',.4,.65),'green':('#6f9268',.95,0),'leaf':('#557d56',.95,0),'bark':('#78654d',1,0),'water':('#5597a7',.18,.3),'asphalt':('#657375',.95,0),'white':('#f0ead8',.65,0),'gold':('#dab469',.65,.3),'red':('#bb6653',.7,0),'dark':('#293b44',.85,0),'warm':('#f0d5a3',.4,0),'blue':('#82a6af',.45,.2)}
MATS={}
for name,(hexcode,rough,metal) in PALETTE.items():
    rgb=tuple(int(hexcode[i:i+2],16)/255 for i in (1,3,5));m=bpy.data.materials.get('Remaster '+name) or bpy.data.materials.new('Remaster '+name);m.use_nodes=True;m.diffuse_color=(*rgb,1)
    shader=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED');shader.inputs['Base Color'].default_value=(*rgb,1);shader.inputs['Roughness'].default_value=rough;shader.inputs['Metallic'].default_value=metal
    if name=='warm':shader.inputs['Emission Color'].default_value=(*rgb,1);shader.inputs['Emission Strength'].default_value=.35
    MATS[name]=m
SIZES={'power':3,'water':3,'healthcare':3,'education':2,'waste':2,'police':2,'fire':2,'station':2,'landmark':2,'park':1}
MODELS=[(o,SIZES.get(o.name.removeprefix('remaster_'),4 if 'skyscraper' in o.name else 2 if 'apartment' in o.name else int(o.name.split('_')[2]) if '_site_' in o.name else 1 if any(k in o.name for k in ['house','shop','office','industry']) else 0)) for o in SCENE.objects if o.type=='EMPTY' and o.name.startswith('remaster_')];BUCKETS={};CURRENT=None
def start(name):
    global BUCKETS,CURRENT
    BUCKETS={};CURRENT=name
def geom(name,verts,faces):
    bucket=BUCKETS.setdefault(name,[[],[]]);offset=len(bucket[0]);bucket[0].extend(verts);bucket[1].extend(tuple(offset+i for i in f) for f in faces)
def box(x,y,z,w,d,h,mat='stone'):
    verts=[(x+sx*w/2,y+sy*d/2,z+sz*h/2) for sx,sy,sz in [(-1,-1,-1),(1,-1,-1),(1,1,-1),(-1,1,-1),(-1,-1,1),(1,-1,1),(1,1,1),(-1,1,1)]]
    geom(mat,verts,[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)])
def cyl(x,y,z,r,h,mat='stone',top=None,n=16,axis='z'):
    top=r if top is None else top;verts=[]
    for height,rad in [(-h/2,r),(h/2,top)]:
        for k in range(n):
            a=k*math.tau/n;v=(rad*math.cos(a),rad*math.sin(a),height)
            if axis=='x':v=(v[2],v[1],v[0])
            verts.append((x+v[0],y+v[1],z+v[2]))
    faces=[tuple(reversed(range(n))),tuple(range(n,n*2))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)];geom(mat,verts,faces)
def tree(x,y,s=1):
    cyl(x,y,1.4*s,.15*s,2.8*s,'bark',n=8);cyl(x,y,3.5*s,1.3*s,2.2*s,'leaf',top=.6*s,n=9);cyl(x,y,4.2*s,.95*s,1.2*s,'leaf',top=.1*s,n=9)
def yard(size):
    w=size*10-.4;box(0,0,.1,w,w,.2);box(0,-w/2+1.2,.24,w-1,1.8,.1,'cream')
    for side in [-1,1]:
        box(side*(w/2-.8),0,.22,.9,w-1,.12,'green')
        for y in range(-int(w/2)+2,int(w/2)-1,5):tree(side*(w/2-.8),y,.65)
    for x in range(-int(w/2)+3,int(w/2)-2,3):box(x,-w/2+3.4,.22,2.3,3,.12,'asphalt');box(x-1.2,-w/2+3.4,.32,.06,3,.04,'white')
def facade(x,y,w,d,floors,mat='cream',balcony=False,fheight=2.7,base=.3):
    h=floors*fheight;box(x,y,base+h/2,w,d,h,mat);box(x,y,base,w+.4,d+.4,.3,'roof')
    for f in range(floors):
        z=base+1.5+f*fheight
        for k in range(max(1,int(w/2))):
            px=x-w/2+1+k*2
            for side in [-1,1]:
                box(px,y+side*(d/2+.04),z,.95,.12,1.2,'warm' if (f+k)%7==0 else 'glass')
                box(px,y+side*(d/2+.13),z-.7,1.1,.28,.12,'white')
                if balcony and f>0:box(px,y+side*(d/2+.55),z-.7,1.5,1.1,.14,'stone');box(px,y+side*(d/2+1.02),z-.38,1.5,.08,.6,'metal')
        for k in range(max(1,int(d/2))):
            for side in [-1,1]:box(x+side*(w/2+.04),y-d/2+1+k*2,z,.12,.9,1.2,'glass')
        box(x,y,base+(f+1)*fheight,w+.15,d+.15,.13,'stone')
    box(x,y,base+h+.18,w+.35,d+.35,.35,'roof');box(x,y,base+h+.8,1.8,2,1,'metal');box(x,y-d/2-.1,1.15,1.4,.16,1.9,'glass');box(x,y-d/2-.8,2.3,2.5,1.6,.15,'roof')
def finish(size):
    root=bpy.data.objects.new(CURRENT,None);SCENE.collection.objects.link(root)
    for mat,(verts,faces) in BUCKETS.items():
        mesh=bpy.data.meshes.new(CURRENT+' '+mat);mesh.from_pydata(verts,[],faces);mesh.update();obj=bpy.data.objects.new(CURRENT+' '+mat,mesh);SCENE.collection.objects.link(obj);obj.parent=root;obj.data.materials.append(MATS[mat])
    root.location=((len(MODELS)%8)*38,(len(MODELS)//8)*38,0);MODELS.append((root,size))
def campus(kind,size):
    start('remaster_'+kind);yard(size)
    if kind=='power':
        facade(-4,0,10,10,2,'brick')
        for x in [5,10]:cyl(x,5,4,2.8,8,'stone',top=1.7);cyl(x,5,8.1,1.5,.3,'dark');cyl(x,5,1,3,.3,'metal')
        for x in [-7,-3,1]:
            cyl(x,6,8,.5,16,'cream')
            for z in [12,13.5,15]:cyl(x,6,z,.53,.5,'red')
        for x in [2,6,10]:
            box(x,-5,1.4,2,3,2.3,'roof')
            for y in [-6,-5,-4]:cyl(x,y,3,.2,1,'cream',n=8)
    elif kind=='water':
        for x in [-6,4]:
            for y in [-3,6]:cyl(x,y,1,3.8,1.6,'stone');cyl(x,y,1.87,3.3,.1,'water');box(x,y,2,7.5,.25,.18,'metal');cyl(x,y,2.3,.25,.6,'metal')
        facade(9,5,4,7,2,'cream');box(0,-11,.5,20,2,.6,'roof')
        for x in [-9,-5,0,5,9]:box(x,-10,1,.16,2,1,'blue')
    elif kind=='education':
        facade(-2,2,11,6,2,'brick');facade(5,0,4,9,2);box(-2,-4,.35,7,5,.15,'gold')
        for x in [-4,1]:box(x,-4,1.8,.12,.12,3,'blue');box(x,-4,3.3,3,.15,.15,'blue')
        box(-2,-4,.55,2,1,.5,'red');cyl(-1,2,7.4,.8,2,'cream',n=8)
    elif kind=='healthcare':
        facade(-3,3,14,12,4);facade(6,-4,8,9,2,'blue');cyl(-3,3,11.3,3.5,.12,'roof')
        box(-3,3,11.4,3,.5,.05,'white');box(-4.2,3,11.4,.5,2.8,.05,'white');box(-1.8,3,11.4,.5,2.8,.05,'white');box(-3,-3.1,8,1, .2,3,'red');box(-3,-3.2,8,3,.2,1,'red');box(6,-9,4.8,9,3,.25,'roof')
        box(6,-10,4,5,.2,.7,'red')
    elif kind=='park':
        box(0,0,.3,9,9,.2,'green');box(0,0,.44,1.4,9,.12,'cream');cyl(0,0,.7,1.5,.4);cyl(0,0,.93,1.2,.1,'water')
        for x in [-3,3]:
            for y in [-3,3]:tree(x,y,.8)
            box(x,0,.9,.7,2,.15,'gold');box(x+.28,0,1.1,.13,2,.6,'gold')
    elif kind=='landmark':
        facade(0,1,12,10,2,'brick');cyl(0,1,7.7,2.5,2,'roof',top=.2)
        for x in [-5,-2.5,0,2.5,5]:box(x,-5,1.1,2,2,1.6,'cream');box(x,-5,2.1,2.1,2.3,.13,'red' if x%2 else 'gold')
    elif kind=='station':
        facade(-3,2,7,10,2,'brick');box(3,0,.5,6,16,.6,'stone');box(3,0,3.5,6,16,.25,'roof')
        for y in [-7,0,7]:box(5,y,1.9,.2,.2,3.4,'metal')
    else:
        facade(0,2,12,9,2,'brick' if kind=='fire' else 'blue' if kind=='police' else 'green')
        for x in [-4,0,4]:box(x,-2.6,1.4,2.6,.13,2.5,'dark')
        if kind=='waste':
            for x in [-5,0,5]:box(x,-6,1.4,3,3,2,'gold' if x==0 else 'blue')
        if kind=='fire':box(0,-2.8,5,6,.13,.8,'red')
    finish(size)
def apartment(variant,high=False):
    start('remaster_apartment_'+str(variant)+('_high' if high else ''));yard(2)
    floors=12 if high else 6;facade(0,1,12 if variant%2==0 else 13,11 if variant%2==0 else 9,floors,['cream','brick','blue','stone'][variant%4],True)
    for x in [-4,4]:box(x,1,floors*2.7+1.7,2,3,.15,'glass')
    finish(2)
def tower(variant):
    start('remaster_skyscraper_'+str(variant));yard(1);facade(0,0,8,8,2,'stone');floors=30+variant*5;h=floors*2.6;base=6
    box(0,0,base+h/2,6.7,6.7,h,'glass')
    for f in range(floors):
        z=base+f*2.6;box(0,0,z,6.9,6.9,.14,'metal')
        for k in range(-2,3):
            for side in [-1,1]:
                if (f+k+variant)%7==0:box(k*1.2,side*3.38,z+1.3,.75,.1,1.25,'warm');box(side*3.38,k*1.2,z+1.3,.1,.75,1.25,'warm')
    for k in [-2,-1,0,1,2]:
        for side in [-1,1]:box(k*1.2,side*3.42,base+h/2,.1,.1,h,'metal');box(side*3.42,k*1.2,base+h/2,.1,.1,h,'metal')
    box(0,0,base+h+1,4,4,2,'roof');cyl(0,0,base+h+7,.1,12,'metal',n=8)
    for verts,faces in BUCKETS.values():
        for k,(x,y,z) in enumerate(verts):verts[k]=(x*4,y*4,z)
    finish(4)
def car(variant):
    start('remaster_car_'+str(variant));suv=variant%3==0
    # Chamfered body cross-sections, sloping windshield, rubber tyres and metal rims.
    col=['gold','blue','cream','red','green','metal','roof','brick'][variant]
    ring=[(-.69,.32),(.69,.32),(.8,.5),(.77,.77),(-.77,.77),(-.8,.5)];verts=[(x,y,z) for y in [-1.55,1.55] for x,z in ring]
    geom(col,verts,[tuple(reversed(range(6))),tuple(range(6,12))]+[(i,(i+1)%6,(i+1)%6+6,i+6) for i in range(6)])
    geom('glass',[(-.64,-.95,.78),(.64,-.95,.78),(.64,.85,.78),(-.64,.85,.78),(-.58,-.6,1.27),(.58,-.6,1.27),(.58,.5,1.27),(-.58,.5,1.27)],[(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)])
    box(0,-.05,1.3,1.25,1.2,.12,col);box(0,-.2,.99,.075,1.7,.56,col)
    for x in [-.81,.81]:
        for y in [-1,1]:cyl(x,y,.35,.32,.16,'dark',n=16,axis='x');cyl(x*1.02,y,.35,.16,.17,'metal',n=10,axis='x')
        box(x,.4,1,.18,.3,.15,col)
    for x in [-.52,.52]:box(x,1.57,.63,.32,.06,.19,'warm');box(x,-1.57,.63,.3,.06,.16,'red')
    box(0,1.59,.48,.65,.04,.17,'dark');box(0,-1.59,.45,.44,.04,.15,'white');finish(0)
def site(size,stage):
    start('remaster_site_'+str(size)+'_'+str(stage));w=size*10-1;box(0,0,.2,w,w,.4,'stone');built=2+stage*4
    for x in [-w*.38,w*.38]:
        for y in [-w*.38,w*.38]:box(x,y,built/2,.24,.24,built,'metal')
    for z in range(1,built,3):box(0,0,z,w*.8,w*.8,.17,'stone')
    c=w*.42;box(c,c,10,.35,.35,20,'gold');box(0,c,19.8,w+5,.35,.35,'gold');box(-w*.45,c,18.8,1.4,1.2,1.5,'roof')
    for z in range(1,20,2):box(c,c,z,.8,.8,.12,'gold')
    for y in [-w/2,w/2]:box(0,y,1,w,.14,2,'roof')
    finish(size)
def props():
    start('remaster_tree');tree(0,0);finish(0)
    start('remaster_streetlamp');cyl(0,0,2.7,.08,5.4,'roof',n=8);box(-.6,0,5.4,1.4,.18,.15,'metal');box(-1,0,5.28,.5,.35,.12,'warm');finish(0)
def export_models(only=None):
    os.makedirs(OUT,exist_ok=True);manifest=[]
    for root,size in MODELS:
        root.location=(0,0,0);bpy.context.view_layer.update()
        for obj in bpy.context.selected_objects:obj.select_set(False)
        root.select_set(True)
        for obj in root.children_recursive:obj.select_set(True)
        bpy.context.view_layer.objects.active=root
        if only is None or root.name in only:bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,root.name+'.glb'),export_format='GLB',use_selection=True,use_active_scene=True,export_apply=True)
        verts=[obj.matrix_world@Vector(v) for obj in root.children_recursive if obj.type=='MESH' for v in obj.bound_box]
        mn=[min(v[k] for v in verts) for k in range(3)];mx=[max(v[k] for v in verts) for k in range(3)]
        manifest.append({'id':root.name,'footprint':size,'bounds':[mn,mx],'materials':len(root.children),'source':'Blender MCP'})
    with open(os.path.join(OUT,'remaster-manifest.json'),'w',encoding='utf8') as f:json.dump(manifest,f,indent=2)
    # Display models in an orderly workshop after exporting them at the origin.
    for k,(root,size) in enumerate(MODELS):root.location=((k%8)*38,(k//8)*38,0)
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT,'art','rivergate-remastered.blend'))
    print('REMMASTER_EXPORTED',len(manifest),'assets')
def build_part(part):
    if part==1:
        for kind,size in [('power',3),('water',3),('education',2),('healthcare',3),('waste',2),('police',2),('fire',2),('park',1),('station',2),('landmark',2)]:campus(kind,size)
    elif part==2:
        for variant in range(4):apartment(variant)
        for variant in range(2):apartment(variant,True)
        for variant in range(4):tower(variant)
    elif part==3:
        for variant in range(8):car(variant)
        for size in [1,2,3]:
            for stage in range(4):site(size,stage)
        props();export_models()

def gable(x,y,z,w,d,mat='roof'):
    geom(mat,[(x-w/2,y-d/2,z),(x+w/2,y-d/2,z),(x-w/2,y+d/2,z),(x+w/2,y+d/2,z),(x,y-d/2,z+w*.26),(x,y+d/2,z+w*.26)],[(0,4,1),(2,3,5),(0,2,5,4),(1,4,5,3),(0,1,3,2)])
def streetside(family,variant):
    start('remaster_'+family+'_'+str(variant));yard(1)
    col=['cream','brick','stone','blue','cream','brick'][variant%6]
    if family=='house':
        floors=1+variant%2;w=5.5+(variant%3)*.7;d=5.4+(variant%4)*.45;facade(-.5,.3,w,d,floors,col)
        if variant%4!=0:gable(-.5,.3,floors*2.7+.5,w+.5,d+.4,'brick' if variant%3==1 else 'roof')
        else:box(1,.3,floors*2.7+.7,2,3,.2,'glass')
        if variant%3==0:facade(2.8,2.5,2.8,2.8,1,'cream')
        box(-2,-3.5,.4,2,1,.25,'green');box(2,-3.2,.35,1.3,1.3,.4,'brick');tree(3.4,2,.6)
    elif family=='shop':
        floors=1+variant%3;facade(0,1,7,6,floors,col);box(0,-2.1,1.5,6,.16,1.8,'glass')
        for x in [-2,0,2]:box(x,-2.8,2.6,1.9,1.6,.12,'red' if variant%2 else 'gold');box(x,-3.6,1.2,.8,.8,.12,'cream')
        if variant%3==0:gable(0,1,floors*2.7+.5,7.4,6.4)
        if variant%3==1:cyl(0,1,floors*2.7+1,1.5,1,'roof',top=.2)
    else:
        floors=5+variant%5;facade(0,0,7.5,7.5,floors,col)
        if variant%3==0:facade(0,0,5,5,2,'glass',base=floors*2.7+.5)
        if variant%3==1:box(0,0,floors*2.7+2,4,4,3,'roof')
        box(0,-4,1.5,3,1,.15,'metal')
    finish(1)
def works(kind,variant):
    start('remaster_industry_'+kind+'_'+str(variant));yard(1);facade(-.4,1,6.5,5,1,'brick',fheight=3.5)
    if kind in ['factory','foundry','mine']:
        for x in [-2,1]:cyl(x,2,5,.4,10,'cream');cyl(x,2,8,.43,.7,'red')
        for x in [-2,0,2]:box(x,-2,1.2,1.5,.15,2,'dark');box(x,-3.3,.65,1.5,1.6,1,'metal')
    elif kind in ['farm','mill']:
        gable(-.4,1,4,7,5.5,'red');cyl(3,2,2.5,.9,5,'cream');cyl(3,2,5.4,.9,.7,'roof',top=.1)
        if kind=='farm':
            for x in [-3,-1,1,3]:box(x,-3,.4,.6,3,.4,'green')
    else:
        gable(-.4,1,4,7,5.5);box(2,-3,1,2.4,2.4,1.6,'gold');box(-2,-3,.8,2,2,1.2,'brick')
    if variant:box(2,2,3.8,2,3,.16,'glass');box(-3.5,0,1,.2,5,2,'roof')
    finish(1)
def architecture_parts(root):
    """Building families no longer receive decorative Architecture Game kit parts."""
    return

def more_models(part):
    if part==4:
        for v in range(24):streetside('house',v)
        for v in range(18):streetside('shop',v)
        for root,size in MODELS[-42:]:architecture_parts(root)
    elif part==5:
        for v in range(12):streetside('office',v)
        for kind in ['farm','timber','mine','mill','foundry','factory','furniture']:
            for v in range(2):works(kind,v)
        for v in range(4,12):apartment(v)
        for v in range(4,12):tower(v)
    elif part==6:
        # Different bodies for delivery vans, pickups, taxi and emergency vehicles.
        for v in range(8):
            start('remaster_vehicle_'+str(v));col=['cream','gold','blue','red','white','green','metal','roof'][v]
            box(0,0,.65,1.7,3.8,.8,col);box(0,-.8,1.4,1.65,2,1.1,col);box(0,.9,1.15,1.4,1.3,.7,'glass');box(0,.9,1.55,1.5,1.4,.13,col)
            for x in [-.9,.9]:
                for y in [-1.2,1.2]:cyl(x,y,.4,.37,.18,'dark',axis='x');cyl(x,y,.4,.18,.19,'metal',axis='x')
            for x in [-.55,.55]:box(x,1.94,.65,.32,.1,.2,'warm');box(x,-1.94,.65,.3,.1,.2,'red')
            if v in [3,4]:box(0,.8,1.8,1,.25,.15,'red');box(.86,-.8,1.4,.08,.8,.22,'red');box(.9,-.8,1.4,.08,.22,.8,'red')
            if v==1:box(0,.8,1.8,.7,.4,.3,'gold')
            finish(0)
        export_models()
